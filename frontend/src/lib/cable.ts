import { createConsumer } from "@rails/actioncable";
import { config } from "./config";

export const consumer = createConsumer(config.cableUrl);
