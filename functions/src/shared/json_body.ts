import express from "express";

export function json_body() {
  return express.json({
    limit: "256kb",
    type: ["application/json", "application/*+json"]
  });
}
