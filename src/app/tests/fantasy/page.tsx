import { fantasyTest } from "@/data/tests/fantasy";
import { FantasyTestClient } from "./FantasyTestClient";

export default function FantasyTestPage() {
  return <FantasyTestClient test={fantasyTest} />;
}