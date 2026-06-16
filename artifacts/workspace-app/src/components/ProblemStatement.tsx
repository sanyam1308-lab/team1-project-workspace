import React, { useState, useEffect, useRef } from "react";
import { 
  useListProblemCards, 
  useUpdateProblemCard, 
  getListProblemCardsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export default function ProblemStatement() {
  const { data: cards, isLoading } = useListProblemCards({
    query: { refetchInterval: 5000, queryKey: getListProblemCardsQueryKey() }
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse bg-muted rounded-none" />;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold uppercase text-primary tracking-widest">
        1. Problem Statement
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards?.map((card) => (
          <ProblemCardItem key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}

function ProblemCardItem({ card }: { card: { key: string; label: string; content: string } }) {
  const [content, setContent] = useState(card.content);
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();
  
  const updateCard = useUpdateProblemCard();

  const prevContentRef = useRef(card.content);

  useEffect(() => {
    if (prevContentRef.current !== card.content && content === prevContentRef.current) {
      setContent(card.content);
      prevContentRef.current = card.content;
    }
  }, [card.content, content]);

  const handleSave = () => {
    updateCard.mutate(
      { key: card.key, data: { content } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProblemCardsQueryKey() });
          setIsSaved(true);
          prevContentRef.current = content;
          setTimeout(() => setIsSaved(false), 2000);
        }
      }
    );
  };

  return (
    <div className="bg-card p-6 border border-border shadow-sm flex flex-col h-full space-y-4">
      <label className="text-sm font-bold uppercase text-foreground">{card.label}</label>
      <Textarea
        className="flex-1 min-h-[120px] resize-none border-input focus-visible:ring-1 focus-visible:ring-primary rounded-none shadow-none"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-green-600 font-bold min-h-5">
          {isSaved ? "SAVED SUCCESSFULLY" : ""}
        </span>
        <Button 
          onClick={handleSave}
          disabled={updateCard.isPending}
          className="uppercase font-bold rounded-none"
        >
          {updateCard.isPending ? "SAVING..." : "SAVE"}
        </Button>
      </div>
    </div>
  );
}
