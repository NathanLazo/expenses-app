import type { MetadataRoute } from "next";

import { siteUrl } from "~/lib/seo";

const routes = [
  "/",
  "/chat",
  "/expenses",
  "/categories",
  "/reports",
  "/settings",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
