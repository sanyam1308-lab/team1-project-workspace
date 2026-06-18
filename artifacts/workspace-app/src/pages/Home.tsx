import React from "react";
import Header from "../components/Header";
import ProblemStatement from "../components/ProblemStatement";
import BrainstormBoard from "../components/BrainstormBoard";
import ProjectPlan from "../components/ProjectPlan";
import QcAgent from "../components/QcAgent";
import ScoringRubric from "../components/ScoringRubric";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <Header />

        <Tabs defaultValue="workspace" className="w-full">
          <TabsList className="h-auto rounded-none bg-transparent p-0 gap-0 border-b border-border w-full justify-start">
            <TabsTrigger
              value="workspace"
              className="rounded-none uppercase font-bold tracking-wide px-6 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Project Workspace
            </TabsTrigger>
            <TabsTrigger
              value="qc-agent"
              className="rounded-none uppercase font-bold tracking-wide px-6 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              QC Agent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="mt-10">
            <main className="space-y-16">
              <ProblemStatement />
              <BrainstormBoard />
              <ProjectPlan />
              <ScoringRubric />
            </main>
          </TabsContent>

          <TabsContent value="qc-agent" className="mt-10">
            <QcAgent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
