import {
  createRootRoute,
  createRouter,
  RouterProvider as TanStackRouterProvider,
  useBlocker as useTanStackBlocker,
  useLocation as useTanStackLocation,
  useRouter,
} from "@tanstack/react-router";
import type {
  RouterBlockerFunction,
  RouterLocation,
  RouterMatch,
  RouterNavigateFunction,
  RouterProvider,
  RouterBlocker,
  RouterRouteProps,
  RouterRoutesProps,
} from "ra-core";
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RouteContextValue = {
  basePath: string;
  params: Record<string, string | undefined>;
};

const RouteContext = createContext<RouteContextValue>({
  basePath: "/",
  params: {},
});

const RouterContext = createContext(false);

type RouteElement = {
  path?: string;
  element?: ReactNode;
  children?: ReactNode;
};

type PathMatch = {
  params: Record<string, string>;
  pathnameBase: string;
};

const normalizePathname = (pathname: string) => {
  if (pathname.length <= 1) return "/";
  return pathname.replace(/\/+$/, "");
};

const joinPaths = (parent: string, child: string) => {
  const normalizedParent = normalizePathname(parent || "/");
  if (!child || child === "/") return normalizedParent;
  return `${normalizedParent}/${child.replace(/^\/+/, "")}`.replace(
    /\/+/g,
    "/",
  );
};

const decodeParam = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const matchRoutePath = (
  pattern: string | undefined,
  pathname: string,
  parentBasePath: string,
): PathMatch | null => {
  const routePattern = pattern || "*";
  const fullPattern =
    routePattern === "/"
      ? "/"
      : routePattern.startsWith("/")
        ? routePattern
        : joinPaths(parentBasePath, routePattern);
  const patternSegments = normalizePathname(fullPattern)
    .split("/")
    .filter(Boolean);
  const pathnameSegments = normalizePathname(pathname)
    .split("/")
    .filter(Boolean);
  const params: Record<string, string> = {};
  const isWildcard = patternSegments.at(-1) === "*";
  const requiredSegments = isWildcard
    ? patternSegments.slice(0, -1)
    : patternSegments;

  if (
    pathnameSegments.length < requiredSegments.length ||
    (!isWildcard && pathnameSegments.length !== requiredSegments.length)
  ) {
    return null;
  }

  for (const [index, segment] of requiredSegments.entries()) {
    const value = pathnameSegments[index];
    if (!value) return null;
    if (segment === "*") continue;
    if (segment.startsWith(":")) {
      const optional = segment.endsWith("?");
      const name = segment.slice(1, optional ? -1 : undefined);
      params[name] = decodeParam(value);
      continue;
    }
    if (segment !== value) return null;
  }

  const baseSegments = pathnameSegments.slice(
    0,
    isWildcard ? requiredSegments.length : pathnameSegments.length,
  );
  return {
    params,
    pathnameBase: baseSegments.length ? `/${baseSegments.join("/")}` : "/",
  };
};

const flattenRoutes = (children: ReactNode): RouteElement[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === TanStackRoute) {
      return [child.props as unknown as RouteElement];
    }
    if (child.type === FragmentRoute) {
      return flattenRoutes((child.props as { children?: ReactNode }).children);
    }
    return [];
  });

const findRoute = (
  children: ReactNode,
  pathname: string,
  parentContext: RouteContextValue,
): { element: ReactNode; context: RouteContextValue } | null => {
  for (const route of flattenRoutes(children)) {
    const match = matchRoutePath(route.path, pathname, parentContext.basePath);
    if (!match) continue;
    const context = {
      basePath: match.pathnameBase,
      params: { ...parentContext.params, ...match.params },
    };
    return {
      context,
      element: route.element ?? (
        <TanStackRoutes>{route.children}</TanStackRoutes>
      ),
    };
  }
  return null;
};

const TanStackRoute = (_props: RouterRouteProps) => null;
const FragmentRoute = ({ children }: { children?: ReactNode }) => children;

const TanStackRoutes = ({ children }: RouterRoutesProps) => {
  const location = useTanStackLocation();
  const parentContext = useContext(RouteContext);
  const result = findRoute(children, location.pathname, parentContext);
  if (!result) return null;
  return (
    <RouteContext.Provider value={result.context}>
      {result.element}
    </RouteContext.Provider>
  );
};

const toRouterLocation = (location: {
  pathname: string;
  searchStr?: string;
  hash?: string;
  state?: unknown;
}): RouterLocation => ({
  hash: location.hash ? `#${location.hash.replace(/^#/, "")}` : "",
  pathname: location.pathname,
  search: location.searchStr ? `?${location.searchStr.replace(/^\?/, "")}` : "",
  state: location.state,
});

const toHref = (to: RouterLocation | Partial<RouterLocation> | string) => {
  if (typeof to === "string") return to;
  return `${to.pathname}${to.search || ""}${to.hash || ""}`;
};

const TanStackLink = forwardRef<HTMLAnchorElement, any>(
  ({ children, replace, state, to, ...props }, ref) => {
    const router = useRouter();
    const href = toHref(to);
    return (
      <a
        {...props}
        ref={ref}
        href={href}
        onClick={(event) => {
          props.onClick?.(event);
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          if (replace) router.history.replace(href, state);
          else router.history.push(href, state);
        }}
      >
        {children}
      </a>
    );
  },
);
TanStackLink.displayName = "TanStackLink";

const TanStackNavigate = ({ to, replace, state }: any) => {
  const router = useRouter();
  const href = toHref(to);
  useEffect(() => {
    if (replace) router.history.replace(href, state);
    else router.history.push(href, state);
  }, [href, replace, router, state]);
  return null;
};

const TanStackOutlet = () => null;

const useTanStackNavigate = (): RouterNavigateFunction => {
  const router = useRouter();
  return (to, options) => {
    if (typeof to === "number") {
      router.history.go(to);
      return;
    }
    const href = toHref(to);
    if (options?.replace) router.history.replace(href, options.state);
    else router.history.push(href, options?.state);
  };
};

const useTanStackBlockerAdapter = (
  shouldBlock: RouterBlockerFunction | boolean,
): RouterBlocker => {
  const enabled = typeof shouldBlock === "boolean" ? shouldBlock : true;
  const blocker = useTanStackBlocker({
    disabled: !enabled,
    enableBeforeUnload: enabled,
    withResolver: true,
    shouldBlockFn: async ({ action, current, next }) => {
      if (typeof shouldBlock === "boolean") return shouldBlock;
      return shouldBlock({
        currentLocation: {
          hash: "",
          pathname: current.pathname,
          search: "",
        },
        historyAction:
          action === "PUSH" ? "PUSH" : action === "REPLACE" ? "REPLACE" : "POP",
        nextLocation: {
          hash: "",
          pathname: next.pathname,
          search: "",
        },
      });
    },
  });

  if (blocker.status === "blocked") {
    return {
      location: {
        hash: "",
        pathname: blocker.next.pathname,
        search: "",
      },
      proceed: blocker.proceed,
      reset: blocker.reset,
      state: "blocked" as const,
    };
  }
  return {
    location: undefined,
    proceed: undefined,
    reset: undefined,
    state: "unblocked" as const,
  };
};

const createTanStackRouterProvider = (): RouterProvider => ({
  Link: TanStackLink,
  Navigate: TanStackNavigate,
  Outlet: TanStackOutlet,
  Route: TanStackRoute,
  Routes: TanStackRoutes,
  RouterWrapper: TanStackRouterWrapper,
  matchPath: (pattern, pathname) => {
    const match = matchRoutePath(
      typeof pattern === "string" ? pattern : pattern.path,
      pathname,
      "/",
    );
    return match
      ? ({
          params: match.params,
          pathname,
          pathnameBase: match.pathnameBase,
        } satisfies RouterMatch)
      : null;
  },
  useBlocker: useTanStackBlockerAdapter,
  useCanBlock: () => true,
  useInRouterContext: () => useContext(RouterContext),
  useLocation: () => {
    const location = useTanStackLocation();
    return toRouterLocation(location);
  },
  useMatch: (pattern) => {
    const location = useTanStackLocation();
    const match = matchRoutePath(pattern.path, location.pathname, "/");
    return match
      ? {
          params: match.params,
          pathname: location.pathname,
          pathnameBase: match.pathnameBase,
        }
      : null;
  },
  useNavigate: useTanStackNavigate,
  useParams: <T extends Record<string, string | undefined>>() =>
    useContext(RouteContext).params as T,
});

export const tanStackRouterProvider = createTanStackRouterProvider();

export const matchPathPattern = (
  pattern: string,
  pathname: string,
): RouterMatch | null => {
  const match = matchRoutePath(pattern, pathname, "/");
  return match
    ? {
        params: match.params,
        pathname,
        pathnameBase: match.pathnameBase,
      }
    : null;
};

function TanStackRouterWrapper({
  basename,
  children,
}: {
  basename?: string;
  children: ReactNode;
}) {
  const alreadyInRouter = useContext(RouterContext);
  const childrenRef = useRef(children);
  childrenRef.current = children;
  const [router] = useState(() => {
    const rootRoute = createRootRoute({
      component: () => (
        <RouterContext.Provider value>
          {childrenRef.current}
        </RouterContext.Provider>
      ),
    });
    return createRouter({
      basepath: basename,
      routeTree: rootRoute,
    });
  });

  if (alreadyInRouter) return <>{children}</>;
  return <TanStackRouterProvider router={router} />;
}

export const Router = ({ children }: { children?: ReactNode }) => (
  <FragmentRoute>{children}</FragmentRoute>
);
