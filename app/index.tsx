import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to camera page as the entry point
  return <Redirect href="/camera" />;
}