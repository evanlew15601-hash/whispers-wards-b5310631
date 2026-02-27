import { codexCategories, codexEntries } from '@/game/codex';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const CodexPanel = () => {
  return (
    <div className="parchment-border rounded-sm bg-card p-4">
      <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">Codex</div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Spoiler-safe notes on the realm.
      </div>

      <div className="mt-4 grid gap-6">
        {codexCategories.map(category => {
          const entries = codexEntries.filter(e => e.category === category);
          if (!entries.length) return null;

          return (
            <div key={category}>
              <div className="font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                {category}
              </div>

              <Accordion type="multiple" className="mt-2">
                {entries.map(entry => (
                  <AccordionItem key={entry.id} value={entry.id}>
                    <AccordionTrigger className="text-sm text-card-foreground hover:no-underline">
                      <div className="flex flex-col items-start">
                        <div className="font-medium">{entry.title}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{entry.summary}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {entry.paragraphs.map((p, idx) => (
                          <p key={idx}>{p}</p>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CodexPanel;
