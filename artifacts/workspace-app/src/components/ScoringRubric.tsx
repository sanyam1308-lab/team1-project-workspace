import React from "react";

export default function ScoringRubric() {
  const rubrics = [
    { title: "AI Use & Depth", points: 35, desc: "Did AI do meaningful work? Highest weight." },
    { title: "Working Quality", points: 20, desc: "Does it actually work live?" },
    { title: "Impact & Outcome", points: 20, desc: "Can we quantify the improvement?" },
    { title: "Clarity of Thinking", points: 20, desc: "Can each of us explain our AI choices?" },
    { title: "Problem Relevance", points: 5, desc: "Is this worth solving for the org?" },
  ];

  return (
    <section className="space-y-6 pb-12">
      <h2 className="text-xs font-bold uppercase text-primary tracking-widest">
        4. Scoring Rubric Reference
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {rubrics.map((r, i) => (
          <div key={i} className="bg-card border border-border p-5 shadow-sm flex flex-col">
            <span className="text-2xl font-extrabold text-primary mb-2">{r.points} pts</span>
            <h3 className="font-bold text-foreground text-sm uppercase mb-2">{r.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
