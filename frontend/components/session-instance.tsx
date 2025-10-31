import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface MedicalEntry {
  id: string;
  type: "imaging" | "lab" | "note";
  title: string;
  content: string | File;
  date: string;
}

interface SessionInstanceProps {
  entries: MedicalEntry[];
  setEntries: (entries: MedicalEntry[]) => void;
}

export const SessionInstance = ({
  entries,
  setEntries,
}: SessionInstanceProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [entryType, setEntryType] = useState<"imaging" | "lab" | "note">(
    "note"
  );
  const [entryTitle, setEntryTitle] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const [entryFile, setEntryFile] = useState<File | null>(null);

  const addEntry = () => {
    if (
      entryTitle.trim() &&
      (entryType === "note" ? entryContent.trim() : entryFile)
    ) {
      const newEntry: MedicalEntry = {
        id: Date.now().toString(),
        type: entryType,
        title: entryTitle,
        content: entryType === "note" ? entryContent : entryFile!,
        date: new Date().toLocaleDateString(),
      };
      setEntries([...entries, newEntry]);
      setEntryTitle("");
      setEntryContent("");
      setEntryFile(null);
      setShowAddForm(false);
    }
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Session Entries</h3>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-7 px-2 text-xs"
        >
          <Plus className="h-2 w-2 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <Card className="p-3 mb-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Entry Type</Label>
              <Select
                value={entryType}
                onValueChange={(value: "imaging" | "lab" | "note") =>
                  setEntryType(value)
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imaging">Imaging Result</SelectItem>
                  <SelectItem value="lab">Lab Result</SelectItem>
                  <SelectItem value="note">Doctor Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Enter title..."
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">
                {entryType === "note" ? "Content" : "Upload File"}
              </Label>
              {entryType === "note" ? (
                <Textarea
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  placeholder="Enter content..."
                  className="min-h-[60px] resize-none"
                />
              ) : (
                <Input
                  type="file"
                  onChange={(e) => setEntryFile(e.target.files?.[0] || null)}
                  className="h-8"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addEntry} className="h-7 text-xs">
                Add Entry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Entries List - Scrollable area (hidden while add form open) */}
      {!showAddForm && (
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
          <div className="space-y-2 pr-1 mt-3">
            {entries.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No entries yet. Click "Add" to create your first entry.
              </div>
            ) : (
              entries.map((entry) => (
                <Card key={entry.id} className="p-0 m-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 m-0">
                      <Badge
                        variant={
                          entry.type === "imaging"
                            ? "default"
                            : entry.type === "lab"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {entry.type === "imaging"
                          ? "Imaging"
                          : entry.type === "lab"
                          ? "Lab"
                          : "Note"}
                      </Badge>
                      {/* <span className="text-xs text-muted-foreground">
                        {entry.date}
                      </span> */}
                      <h4 className="text-xs font-medium">{entry.title}</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeEntry(entry.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* <h4 className="text-sm font-medium">{entry.title}</h4> */}
                  {/* <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {typeof entry.content === "string"
                      ? entry.content
                      : entry.content?.name}
                  </p> */}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
