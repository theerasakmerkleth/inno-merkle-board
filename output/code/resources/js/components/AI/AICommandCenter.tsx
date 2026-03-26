import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

interface Props {
    projectId: number;
    projectKey: string;
}

export function AICommandCenter({ projectId, projectKey }: Props) {
    const [prompt, setPrompt] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [analysisNotes, setAnalysisNotes] = useState('');
    const [modelUsed, setModelUsed] = useState('');

    // Insight State
    const [isFetchingInsights, setIsFetchingInsights] = useState(false);
    const [insights, setInsights] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!prompt.trim()) return;
        setIsAnalyzing(true);
        try {
            const response = await fetch(`/projects/${projectId}/ai/analyze`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content
                },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            setSuggestions(data.suggested_tasks);
            setAnalysisNotes(data.analysis_notes);
            setModelUsed(data.model_used);
            toast.success('AI has generated a roadmap draft.');
        } catch (error) {
            toast.error('AI Analysis failed.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fetchInsights = async () => {
        setIsFetchingInsights(true);
        try {
            const response = await fetch(`/projects/${projectId}/ai/auto-plan`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content
                }
            });
            const data = await response.json();
            setInsights(data);
        } catch (error) {
            console.error("Failed to fetch insights", error);
        } finally {
            setIsFetchingInsights(false);
        }
    };

    const handleCommit = async () => {
        try {
            await fetch(`/projects/${projectId}/ai/commit`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content
                },
                body: JSON.stringify({ tasks: suggestions })
            });
            toast.success('Backlog has been committed to the board!');
            setSuggestions([]);
            setPrompt('');
        } catch (error) {
            toast.error('Commit failed.');
        }
    };

    const renderDescription = (desc: string) => {
        if (!desc) return '';
        const parts = desc.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-bold text-foreground">{part.slice(2, -2)}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-all font-black text-[10px] uppercase tracking-wider shadow-md shadow-primary/5 border border-primary/20">
                    <span className="material-icons text-[16px] animate-pulse">smart_toy</span>
                    AI Co-Pilot
                </button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[500px] p-0 flex flex-col bg-background">
                <SheetHeader className="p-6 border-b border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="material-icons text-primary text-[24px]">psychology</span>
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold tracking-tight">AI Project Assistant</SheetTitle>
                            <SheetDescription className="text-xs text-muted-foreground">Gathering requirements & automated planning.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="gather" className="flex-1 flex flex-col" onValueChange={(val) => val === 'risk' && fetchInsights()}>
                    <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/50 rounded-lg p-1">
                        <TabsTrigger value="gather" className="text-[10px] uppercase font-black tracking-widest">Analyze</TabsTrigger>
                        <TabsTrigger value="plan" className="text-[10px] uppercase font-black tracking-widest">Backlog ({suggestions.length})</TabsTrigger>
                        <TabsTrigger value="risk" className="text-[10px] uppercase font-black tracking-widest">Insights</TabsTrigger>
                    </TabsList>

                    <TabsContent value="gather" className="flex-1 p-6 flex flex-col gap-6 outline-none">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Input Project Requirements</label>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., We need a feature to export project roadmaps to PDF and PNG. It should have a button in the roadmap header..."
                                className="w-full h-40 bg-card border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !prompt}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 disabled:opacity-50 transition-all hover:translate-y-[-2px]"
                        >
                            {isAnalyzing ? 'Analyzing with AI...' : 'Gather & Breakdown'}
                        </button>
                        {analysisNotes && (
                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Engine: {modelUsed}</span>
                                </div>
                                <p className="text-xs font-mono text-primary leading-relaxed">{analysisNotes}</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="plan" className="flex-1 p-6 overflow-y-auto outline-none">
                        <div className="space-y-4">
                            {suggestions.map((s, i) => (
                                <div key={i} className="p-4 bg-card border border-border rounded-xl shadow-sm hover:border-primary/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-sm font-bold text-foreground leading-tight">{s.title}</h4>
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter ${s.priority === 'high' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                            {s.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                                </div>
                            ))}
                            {suggestions.length > 0 ? (
                                <button 
                                    onClick={handleCommit}
                                    className="w-full mt-6 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    Confirm & Create Tasks
                                </button>
                            ) : (
                                <div className="py-20 text-center opacity-30">
                                    <span className="material-icons text-4xl mb-2">list_alt</span>
                                    <p className="text-xs font-bold uppercase tracking-widest">No draft items yet</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="risk" className="flex-1 p-6 overflow-y-auto outline-none">
                        {isFetchingInsights ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse text-zinc-400">
                                <span className="material-icons text-4xl mb-2">sync</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">AI Calculating Project Health...</p>
                            </div>
                        ) : insights ? (
                            <div className="space-y-6">
                                <div className={`p-6 rounded-2xl border-dashed border-2 flex flex-col items-center text-center ${insights.risk_level === 'high' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <span className={`material-icons text-4xl mb-2 ${insights.risk_level === 'high' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {insights.risk_level === 'high' ? 'warning_amber' : 'check_circle_outline'}
                                    </span>
                                    <h3 className={`text-xs font-black uppercase tracking-widest ${insights.risk_level === 'high' ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {insights.risk_level === 'high' ? 'High Risk Detected' : 'Healthy Project'}
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-card border border-border p-4 rounded-xl text-center">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Overloaded</div>
                                        <div className="text-xl font-black text-zinc-900 mt-1">{insights.analysis.overloaded_count}</div>
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-xl text-center">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">At Risk Tasks</div>
                                        <div className="text-xl font-black text-zinc-900 mt-1">{insights.analysis.at_risk_tasks}</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Mitigation Suggestions</h4>
                                    {insights.suggestions.map((s: string, i: number) => (
                                        <div key={i} className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl flex gap-3 items-start">
                                            <span className="material-icons text-[16px] text-primary mt-0.5">lightbulb</span>
                                            <p className="text-[12px] leading-relaxed text-zinc-600">{renderDescription(s)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
