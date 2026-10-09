import { fakerEN_US as faker } from "@faker-js/faker";

import { randomDate } from "./utils";
import { defaultCompanySectors } from "../../../root/defaultConfiguration";
import type { Company, RAFile } from "../../../types";
import type { Db } from "./types";

const sizes = [1, 10, 50, 250, 500];

const regex = /\W+/;

export const generateCompanies = (db: Db, size = 55): Required<Company>[] => {
  return Array.from(Array(size).keys()).map((id) => {
    const name = faker.company.name();
    return {
      id,
      name: name,
      logo: {
        title: faker.lorem.sentence(),
        src: `https://marmelab.com/react-admin-crm/logos/${id}.png`,
      } as RAFile,
      sector: faker.helpers.arrayElement(defaultCompanySectors).value,
      size: faker.helpers.arrayElement(sizes) as 1 | 10 | 50 | 250 | 500,
      linkedin_url: `https://www.linkedin.com/company/${name
        .toLowerCase()
        .replace(regex, "_")}`,
      website: faker.internet.url(),
      phone_number: faker.phone.number(),
      address: faker.location.streetAddress(),
      zipcode: faker.location.zipCode(),
      city: faker.location.city(),
      state_abbr: faker.location.state({ abbreviated: true }),
      nb_contacts: 0,
      nb_deals: 0,
      // at least 1/3rd of companies for Jane Doe
      sales_id:
        faker.number.int(2) === 0 ? 0 : faker.helpers.arrayElement(db.sales).id,
      created_at: randomDate().toISOString(),
      description: faker.lorem.paragraph(),
      revenue: faker.helpers.arrayElement(["$1M", "$10M", "$100M", "$1B"]),
      tax_identifier: faker.string.alphanumeric(10),
      country: faker.helpers.arrayElement(["USA", "France", "UK"]),
      context_links: [],
    };
  });
};
