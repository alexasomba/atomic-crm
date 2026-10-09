import { input, select } from "@inquirer/prompts";
import { spawn } from "node:child_process";
import fs from "node:fs";

(async () => {
  await loginToSupabase();
  const projectName = await input({
    message: "Enter the name of the project:",
    default: "Atomic CRM",
  });
  const databasePassword = await input({
    message: "Enter a database password:",
    default: generatePassword(16),
  });

  const organizationId = await selectOrganization();

  const region = await selectRegion();

  const projectRef = await createProject({
    projectName,
    databasePassword,
    organizationId,
    region,
  });
  await waitForProjectToBeReady({ projectRef });

  // This also ensures the project is ready
  const { publishableKey } = await fetchApiKeys({
    projectRef,
  });

  await linkProject({
    projectRef,
    databasePassword,
  });

  await setupDatabase({
    databasePassword,
  });

  await setupSupabaseSecrets({
    projectRef,
    publishableKey,
  });

  await persistSupabaseEnv({
    projectRef,
    publishableKey,
  });
})();

async function loginToSupabase() {
  await runNpx(["login"], { inheritStdio: true });
}

async function createProject({
  projectName,
  databasePassword,
  organizationId,
  region,
}) {
  const { stdout } = await runNpx([
    "projects",
    "create",
    "--output",
    "json",
    "--db-password",
    databasePassword,
    "--region",
    region,
    ...(organizationId ? ["--org-id", organizationId] : []),
    projectName,
  ]);

  try {
    const matchJSON = stdout.match(new RegExp("{.*}", "s"));
    if (!matchJSON) {
      throw new Error("Invalid JSON output");
    }
    const jsonOuput = JSON.parse(matchJSON[0]);
    return jsonOuput.id;
  } catch (e) {
    console.error("Failed to create project");
    console.error(e);
    throw e;
  }
}

async function selectOrganization() {
  const { stdout: organizationsJson } = await runNpx([
    "orgs",
    "list",
    "--output",
    "json",
  ]);

  const organizations = JSON.parse(organizationsJson);

  if (organizations.length === 0) {
    return null;
  }

  if (organizations.length === 1) {
    return organizations[0].id;
  }

  const selectedOrganizationId = await select({
    message: "Select an organization to create the project in:",
    choices: organizations.map((org) => ({
      name: org.name,
      value: org.id,
    })),
  });

  return selectedOrganizationId;
}

const regions = [
  { value: "us-west-1", name: "West US (North California)" },
  { value: "us-west-2", name: "West US (Oregon)" },
  { value: "us-east-1", name: "East US (North Virginia)" },
  { value: "us-east-2", name: "East US (Ohio)" },
  { value: "ca-central-1", name: "Canada (Central)" },
  { value: "eu-west-1", name: "West EU (Ireland)" },
  { value: "eu-west-2", name: "West Europe (London)" },
  { value: "eu-west-3", name: "West EU (Paris)" },
  { value: "eu-central-1", name: "Central EU (Frankfurt)" },
  { value: "eu-central-2", name: "Central Europe (Zurich)" },
  { value: "eu-north-1", name: "North EU (Stockholm)" },
  { value: "ap-south-1", name: "South Asia (Mumbai)" },
  { value: "ap-southeast-1", name: "Southeast Asia (Singapore)" },
  { value: "ap-northeast-1", name: "Northeast Asia (Tokyo)" },
  { value: "ap-northeast-2", name: "Northeast Asia (Seoul)" },
  { value: "ap-southeast-2", name: "Oceania (Sydney)" },
  { value: "sa-east-1", name: "South America (São Paulo)" },
];

async function selectRegion() {
  const selectedRegion = await select({
    message:
      "Select a region for the project (close to you for best performance):",
    choices: regions.map((region) => ({
      name: region.name,
      value: region.value,
    })),
  });

  return selectedRegion;
}

async function waitForProjectToBeReady({ projectRef }) {
  console.log("Waiting for project to be ready...");
  const { stdout } = await runNpx(["projects", "list", "--output", "json"]);

  try {
    // The response is an Array of objects or null if there are no projects
    const matchJSON =
      stdout === null ? "[]" : stdout.match(new RegExp("\\[.*\\]", "s"));
    if (!matchJSON) {
      throw new Error("Invalid JSON output");
    }
    const jsonOuput = JSON.parse(matchJSON[0]);
    const project = jsonOuput.find((project) => project.id === projectRef);
    if (project.status !== "ACTIVE_HEALTHY") {
      await sleep(1000);
      return waitForProjectToBeReady({ projectRef });
    }
  } catch (e) {
    console.error("Failed to create project");
    console.error(e);
    throw e;
  }
}

let retry = 0;
async function linkProject({ projectRef, databasePassword }) {
  await runNpx(
    ["link", "--project-ref", projectRef, "--password", databasePassword],
    { ignoreStdio: true },
  ).catch(() => {
    retry++;
    if (retry === 1) {
      console.log("Waiting for project to be ready...");
    }
    return sleep(1000).then(() =>
      linkProject({ projectRef, databasePassword }),
    );
  });
}

async function setupDatabase({ databasePassword }) {
  await runNpx(
    [
      "db",
      "push",
      "--linked",
      "--include-roles",
      "--include-seed",
      "--password",
      databasePassword,
    ],
    { inheritStdio: true },
  );
}

async function fetchApiKeys({ projectRef }) {
  let publishableKey = "";
  try {
    const { stdout, exitCode } = await runNpx(
      ["projects", "api-keys", "--output", "json", "--project-ref", projectRef],
      { ignoreStderr: true, allowNonZero: true },
    );
    // If the exitCode is not 0, the command failed most probably because the project is not ready
    if (exitCode === 0) {
      // The response is an Array of objects
      const matchJSON = stdout.match(new RegExp("\\[.*\\]", "s"));
      if (!matchJSON) {
        throw new Error("Invalid JSON output");
      }
      const jsonOutput = JSON.parse(matchJSON[0]);

      // Prioritize the default publishable key, but any publishable key will work.
      publishableKey = jsonOutput.find(
        (key) => key.type === "publishable" && key.name === "default",
      )?.api_key;
      if (!publishableKey) {
        publishableKey = jsonOutput.find(
          (key) => key.type === "publishable",
        )?.api_key;
      }
    }
  } catch (e) {
    console.error("Failed to fetch API keys");
    console.error(e);
    throw e;
  }

  if (publishableKey === "") {
    await sleep(1000);
    return fetchApiKeys({ projectRef });
  }

  return { publishableKey };
}

async function setupSupabaseSecrets({ projectRef, publishableKey }) {
  await runNpx(
    [
      "secrets",
      "set",
      `SB_PUBLISHABLE_KEY=${publishableKey}`,
      "--project-ref",
      projectRef,
    ],
    { inheritStdio: true },
  );
}

function runNpx(args, options = {}) {
  return new Promise((resolve, reject) => {
    const stdio = options.inheritStdio
      ? "inherit"
      : options.ignoreStdio
        ? "ignore"
        : ["ignore", "pipe", options.ignoreStderr ? "ignore" : "pipe"];
    const child = spawn("npx", ["supabase", ...args], {
      stdio,
      windowsHide: true,
    });
    let stdout = "";

    child.stdout?.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      if (exitCode !== 0 && !options.allowNonZero) {
        reject(new Error(`Supabase CLI failed with exit code ${exitCode}`));
        return;
      }
      resolve({ stdout, exitCode });
    });
  });
}

async function persistSupabaseEnv({ projectRef, publishableKey }) {
  fs.writeFileSync(
    `${process.cwd()}/.env.production.local`,
    `
VITE_SUPABASE_URL=https://${projectRef}.supabase.co
VITE_SB_PUBLISHABLE_KEY=${publishableKey}`,
    { flag: "a" },
  );
}

function generatePassword(length) {
  const password = crypto
    .getRandomValues(new BigUint64Array(4))
    .reduce(
      (prev, curr, index) =>
        (!index ? prev : prev.toString(36)) +
        (index % 2 ? curr.toString(36).toUpperCase() : curr.toString(36)),
    )
    .split("")
    .sort(() => 128 - crypto.getRandomValues(new Uint8Array(1))[0])
    .join("");

  if (length) {
    return password.slice(0, length);
  }

  return password;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
