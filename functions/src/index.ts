import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { alert_rules_handler } from "./http/alert_rules";
import { register_device_handler } from "./http/register_device";
import { run_price_check_handler } from "./http/run_price_check";
import { search_handler } from "./http/search";
import { watchlist_handler } from "./http/watchlist";
import { error_handler } from "./shared/error_handler";
import { json_body } from "./shared/json_body";
import { attach_trace_id } from "./shared/trace_id";

const app = express();

app.disable("x-powered-by");
app.use(attach_trace_id());
app.use(json_body());

app.post("/register_device", register_device_handler);
app.get("/search", search_handler);
app.post("/watchlist", watchlist_handler);
app.delete("/watchlist/:watch_id", watchlist_handler);
app.post("/alert_rules", alert_rules_handler);
app.patch("/alert_rules/:rule_id", alert_rules_handler);
app.delete("/alert_rules/:rule_id", alert_rules_handler);
app.post("/run_price_check", run_price_check_handler);

app.use(error_handler());

export const api = onRequest({ region: "asia-northeast3", cors: true }, app);
