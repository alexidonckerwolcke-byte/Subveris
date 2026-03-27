import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

describe("server route registration", () => {
  it("should register membership endpoint", async () => {
    const app = express();
    const server = createServer(app);
    // register routes without starting the server
    await registerRoutes(server, app);

    // inspect the Express router stack to find registered paths
    const paths = (app as any)._router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);

    expect(paths).toContain("/api/family-groups/me/membership");
  });
});
