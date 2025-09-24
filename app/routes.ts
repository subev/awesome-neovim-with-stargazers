import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/awesome.tsx"),
  route("welcome", "routes/home.tsx"),
] satisfies RouteConfig;
