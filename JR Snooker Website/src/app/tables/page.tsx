"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { tables as initialTables } from "@/lib/data/mock"
import { Play, Square, Users, Clock } from "lucide-react"

// Real-time Timer Component
function Timer({ startTime }: { startTime: string }) {
    const [elapsed, setElapsed] = useState("00:00:00");

    useEffect(() => {
        if (!startTime) return;

        const start = new Date(startTime).getTime();

        const updateTime = () => {
            const now = new Date().getTime();
            const diff = now - start;
            if (diff < 0) return;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return <span className="font-mono text-xl">{elapsed}</span>;
}

export default function TablesPage() {
    const [tables, setTables] = useState(initialTables);

    const toggleTableStatus = (id: number) => {
        setTables(currentTables =>
            currentTables.map(table => {
                if (table.id === id) {
                    const isStarting = table.status !== "active";
                    return {
                        ...table,
                        status: isStarting ? "active" : "available",
                        startTime: isStarting ? new Date().toISOString() : null,
                        players: isStarting ? table.maxPlayers : 0 // Auto-fill players on start for demo
                    };
                }
                return table;
            })
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-emerald-400">Table Management</h1>
                <p className="text-muted-foreground mt-1">Live grid of all snooker tables.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tables.map(table => (
                    <Card
                        key={table.id}
                        className={`hover-scale transition-all duration-300 ${table.status === 'active' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : ''}`}
                    >
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{table.name}</CardTitle>
                                    <CardDescription className="flex items-center mt-1">
                                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${table.status === 'active' ? 'bg-emerald-500 animate-pulse' : table.status === 'maintenance' ? 'bg-destructive' : 'bg-muted-foreground'}`}></span>
                                        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                    <Users className="w-4 h-4 mr-1" />
                                    <span className="text-sm font-medium">{table.players}/{table.maxPlayers}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4 flex flex-col items-center justify-center min-h-[100px] bg-background/30 m-4 rounded-lg border border-border/50">
                            {table.status === 'active' && table.startTime ? (
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center">
                                        <Clock className="w-4 h-4 mr-1" /> Session Time
                                    </p>
                                    <Timer startTime={table.startTime} />
                                </div>
                            ) : (
                                <p className="text-muted-foreground font-medium text-lg">Table Available</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            {table.status === 'active' ? (
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => toggleTableStatus(table.id)}
                                >
                                    <Square className="mr-2" /> Stop Session
                                </Button>
                            ) : table.status === 'available' ? (
                                <Button
                                    variant="emerald"
                                    className="w-full"
                                    onClick={() => toggleTableStatus(table.id)}
                                >
                                    <Play className="mr-2" /> Start Session
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full" disabled>
                                    Maintenance
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
