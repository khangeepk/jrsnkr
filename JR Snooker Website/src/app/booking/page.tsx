import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Clock, Users } from "lucide-react"

export default function BookingPage() {
    const timeSlots = ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM", "08:00 PM", "10:00 PM"];

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-emerald-400">Reservations</h1>
                    <p className="text-muted-foreground mt-1">Book tables in advance using the calendar view.</p>
                </div>
                <Button variant="gold">New Booking</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Date</CardTitle>
                            <CardDescription>Choose a day for your reservation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Dummy Calendar Visual */}
                            <div className="border rounded-md p-4 text-center bg-background glassmorphism-card">
                                <CalendarIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <p className="font-medium text-lg">February 2026</p>
                                <div className="grid grid-cols-7 gap-2 mt-4 text-sm text-muted-foreground">
                                    <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
                                </div>
                                <div className="grid grid-cols-7 gap-2 mt-2 text-sm">
                                    <div className="text-muted-foreground/30">26</div>
                                    <div className="text-muted-foreground/30">27</div>
                                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto hover-scale cursor-pointer shadow-md">28</div>
                                    <div className="hover:bg-accent hover:text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors cursor-pointer">1</div>
                                    <div className="hover:bg-accent hover:text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors cursor-pointer">2</div>
                                    <div className="hover:bg-accent hover:text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors cursor-pointer">3</div>
                                    <div className="hover:bg-accent hover:text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors cursor-pointer">4</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                <li className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Available Slots</span>
                                    <span className="font-medium text-emerald-500">24</span>
                                </li>
                                <li className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Confirmed</span>
                                    <span className="font-medium">12</span>
                                </li>
                                <li className="flex justify-between items-center text-sm border-t pt-4">
                                    <span className="text-muted-foreground">VIP Requests</span>
                                    <span className="font-medium text-accent">2</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schedule - Fri, Feb 28</CardTitle>
                            <CardDescription>Available tables mapped by time slot.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {timeSlots.map((time, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:border-primary/30 transition-colors bg-background/50">
                                        <div className="w-32 flex items-center text-muted-foreground font-medium">
                                            <Clock className="w-4 h-4 mr-2" />
                                            {time}
                                        </div>

                                        <div className="flex-1 flex gap-2 flex-wrap">
                                            {/* Mocking random availability per slot */}
                                            {i % 2 === 0 ? (
                                                <>
                                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-sm cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors">Table 2</div>
                                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-sm cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors">Table 4</div>
                                                    <div className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-md text-sm cursor-pointer hover:bg-accent hover:text-black transition-colors">VIP 1</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="px-4 py-1 bg-muted text-muted-foreground rounded-md text-sm">Fully Booked</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
