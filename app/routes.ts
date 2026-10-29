import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("admin", "routes/admin.tsx"),
  route("admin/:orgId", "routes/organization.tsx"),
  route("admin/:orgId/domains", "routes/domains.tsx"),
  route("admin/:orgId/events/:eventId", "routes/event.tsx"),
  route(
    "admin/:orgId/events/:eventId/editions/:editionId/cms",
    "routes/cms.tsx",
  ),
  route("platform", "routes/platform.tsx"),
  route(
    "admin/:orgId/events/:eventId/editions/:editionId/operations",
    "routes/operations.tsx",
  ),
  route("preview/:token", "routes/public.tsx", { id: "public-preview" }),
  route(":slug", "routes/public.tsx", { id: "public-site" }),
  route("expositores/inscricao", "routes/public.tsx", { id: "public-form" }),
  route("candidatura/:receipt", "routes/application-receipt.tsx"),
  route(
    "admin/:orgId/events/:eventId/editions/:editionId/forms",
    "routes/forms.tsx",
  ),
  route(
    "admin/:orgId/events/:eventId/editions/:editionId/applications",
    "routes/applications.tsx",
    { id: "applications-list" },
  ),
  route("admin/:orgId/applications/:applicationId", "routes/applications.tsx", {
    id: "application-detail",
  }),
] satisfies RouteConfig;
