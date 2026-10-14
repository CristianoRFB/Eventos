import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("admin", "routes/admin.tsx"),
  route("admin/:orgId", "routes/organization.tsx"),
  route("admin/:orgId/events/:eventId", "routes/event.tsx"),
  route("platform", "routes/platform.tsx"),
] satisfies RouteConfig;
