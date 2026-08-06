import {
  LinkBase,
  Navigate as AdminNavigate,
  useLocation as useAdminLocation,
  useMatch as useAdminMatch,
  useNavigate as useAdminNavigate,
  useParams as useAdminParams,
  useRouterProvider,
} from "ra-core";
import type { RouterLocation, RouterRouteProps } from "ra-core";

export { tanStackRouterProvider } from "./tanstackRouterProvider";
export { matchPathPattern as matchPath } from "./tanstackRouterProvider";

export const Link = LinkBase;
export const Navigate = AdminNavigate;
export const useLocation = useAdminLocation;
export const useNavigate = useAdminNavigate;
export const useParams = useAdminParams;

export const useMatch = (pattern: string | { path: string; end?: boolean }) =>
  useAdminMatch(typeof pattern === "string" ? { path: pattern } : pattern);

export const Route = (props: RouterRouteProps) => {
  const { Route: ConfiguredRoute } = useRouterProvider();
  return <ConfiguredRoute {...props} />;
};

export const useSearchParams = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const setSearchParams = (
    next: URLSearchParams | string | Record<string, string>,
    options?: { replace?: boolean },
  ) => {
    const search =
      next instanceof URLSearchParams
        ? next.toString()
        : typeof next === "string"
          ? next.replace(/^\?/, "")
          : new URLSearchParams(next).toString();
    const nextLocation: RouterLocation = {
      ...location,
      search: search ? `?${search}` : "",
    };
    navigate(nextLocation, options);
  };
  return [params, setSearchParams] as const;
};
