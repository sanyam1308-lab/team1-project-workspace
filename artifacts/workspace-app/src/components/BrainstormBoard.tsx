import React, { useState } from "react";
import { 
  useListIdeas, 
  useCreateIdea, 
  useDeleteIdea, 
  useUpvoteIdea,
  getListIdeasQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";

export default function BrainstormBoard() {
  const queryClient = useQueryClient();
  const { data: ideas, isLoading } = useListIdeas({
    query: { refetchInterval: 5000, queryKey: getListIdeasQueryKey() }
  });

  const createIdea = useCreateIdea();
  const deleteIdea = useDeleteIdea();
  const upvoteIdea = useUpvoteIdea();

  const [newIdeaText, setNewIdeaText] = useState("");
  const [newIdeaAuthor, setNewIdeaAuthor] = useState("");

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim() || !newIdeaAuthor.trim()) return;
    
    createIdea.mutate(
      { data: { text: newIdeaText, author: newIdeaAuthor } },
      {
        onSuccess: () => {
          setNewIdeaText("");
          setNewIdeaAuthor("");
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
        }
      }
    );
  };

  const handleUpvote = (id: number) => {
    upvoteIdea.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteIdea.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
      }
    });
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold uppercase text-primary tracking-widest">
        2. Brainstorm Board
      </h2>
      
      <div className="bg-muted p-6 border border-border">
        <form onSubmit={handleAddIdea} className="flex flex-col md:flex-row gap-4">
          <Textarea 
            placeholder="Share a new idea..." 
            className="flex-1 resize-none rounded-none shadow-none focus-visible:ring-primary min-h-[60px]"
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
          />
          <div className="flex flex-col gap-4 min-w-[200px]">
            <Input 
              placeholder="Your name" 
              className="rounded-none shadow-none focus-visible:ring-primary"
              value={newIdeaAuthor}
              onChange={(e) => setNewIdeaAuthor(e.target.value)}
            />
            <Button 
              type="submit" 
              className="uppercase font-bold rounded-none w-full"
              disabled={createIdea.isPending || !newIdeaText.trim() || !newIdeaAuthor.trim()}
            >
              ADD IDEA
            </Button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 h-32 animate-pulse bg-muted rounded-none" />
        ) : ideas && ideas.length > 0 ? (
          ideas.map(idea => (
            <div key={idea.id} className="bg-card p-5 border border-border shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-foreground text-sm whitespace-pre-wrap">{idea.text}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase">{idea.author}</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpvote(idea.id)}
                    disabled={upvoteIdea.isPending}
                    className="h-8 rounded-none font-bold px-2"
                  >
                    UPVOTE ({idea.votes})
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(idea.id)}
                    disabled={deleteIdea.isPending}
                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-none px-2 font-bold uppercase text-xs"
                  >
                    REMOVE
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-12 text-center text-muted-foreground border border-dashed border-border">
            No ideas yet. Start brainstorming above!
          </div>
        )}
      </div>
    </section>
  );
}
