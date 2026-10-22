import type { Metadata } from "next";
import { CoaLibrary } from "@/components/coa-library";

export const metadata: Metadata = {
  title: "Certificates of Analysis · Happy Pep",
  description: "Batch-specific certificates of analysis for every Happy Pep research peptide. Third-party HPLC purity and mass spec identity.",
};

export default function Coas() {
  return <CoaLibrary />;
}
