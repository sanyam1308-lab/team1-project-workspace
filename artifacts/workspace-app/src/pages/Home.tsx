import React from "react";
import Header from "../components/Header";
import ProblemStatement from "../components/ProblemStatement";
import BrainstormBoard from "../components/BrainstormBoard";
import ProjectPlan from "../components/ProjectPlan";
import ScoringRubric from "../components/ScoringRubric";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <Header />
        
        <main className="space-y-16">
          <ProblemStatement />
          <BrainstormBoard />
          <ProjectPlan />
          <ScoringRubric />
        </main>
      </div>
    </div>
  );
}
