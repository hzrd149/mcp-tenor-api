#! /usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ContentFilter, type TenorImage } from "./types";
import TenorManager from "./manager";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is required");
}

function formatResult(image: TenorImage): { type: "text"; text: string } {
  return {
    type: "text",
    text: Object.entries({
      url: image.url,
      description: image.description,
      tags: image.tags.join(", "),
    })
      .map((e) => e.join(": "))
      .join("\n"),
  };
}

const CLIENT_KEY = process.env.CLIENT_KEY || "mcp-tenor-api";
const LOCALE = process.env.LOCALE || "en_US";
const COUNTRY = process.env.COUNTRY || "US";

const tenorManager = new TenorManager(
  API_KEY,
  CLIENT_KEY,
  COUNTRY,
  LOCALE,
  ContentFilter.MEDIUM,
);

const server = new McpServer({
  name: "Tenor API",
  version: "1.0.0",
});

server.tool(
  "search",
  "Search for GIFs",
  {
    searchTerm: z.string().min(1).describe("The search term to find GIFs"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum number of results to return"),
  },
  async ({ searchTerm, limit }) => {
    const results = await tenorManager.search(searchTerm, limit);
    return {
      content: results.images.map(formatResult),
    };
  },
);

server.tool("categories", "Get Tenor categories", async () => {
  const categories = await tenorManager.categories();
  return {
    content: [
      {
        type: "text",
        text: categories.map((c) => c.name).join(", "),
      },
    ],
  };
});

server.tool("trending", "Get Tenor trending GIFs", async () => {
  const results = await tenorManager.trending();
  return {
    content: results.images.map(formatResult),
  };
});

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
