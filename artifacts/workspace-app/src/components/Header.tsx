import React, { useState, useEffect } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { TEAM_MEMBERS } from "../lib/team";

export default function Header() {
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const targetDate = parseISO("2026-07-17");
    const diff = differenceInDays(targetDate, new Date());
    setDaysRemaining(Math.max(0, diff));
    
    const interval = setInterval(() => {
      const currentDiff = differenceInDays(targetDate, new Date());
      setDaysRemaining(Math.max(0, currentDiff));
    }, 1000 * 60 * 60); // update every hour

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase text-primary tracking-widest">
          AI Team Challenge &middot; Project Workspace
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
          Team 1 &mdash; Revenue QC Root-Cause Agent
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
          A shared workspace to align on the problem, brainstorm together, and track our build to a working prototype.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 md:gap-8 pt-4 border-t border-border">
        <div className="flex flex-col">
          <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1">Demo Day</span>
          <span className="text-sm font-medium">
            Fri 17 Jul &mdash; <strong className="text-primary">{daysRemaining} days remaining</strong>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1">Build target</span>
          <span className="text-sm font-medium text-foreground">
            Fri 10 Jul &mdash; Finalise prototype ~1 week before Demo Day
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1">Team</span>
          <span className="text-sm font-medium text-foreground">
            {TEAM_MEMBERS.join(" \u00b7 ")}
          </span>
        </div>
      </div>
    </header>
  );
}
