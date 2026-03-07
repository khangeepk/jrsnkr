import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { recentTransactions } from "@/lib/data/mock"
import { Coffee, Shield, Receipt, Monitor } from "lucide-react"

export default function POSPage() {
    const categories = [
        { name: "Table Fees", icon: <Monitor className="w-6 h-6 mb-2 text-primary" />, items: ["1 Hour", "2 Hours", "Day Pass"] },
        { name: "Snacks & Drinks", icon: <Coffee className="w-6 h-6 mb-2 text-primary" />, items: ["Coffee", "Energy Drink", "Water", "Sandwich"] },
        { name: "Cue Services", icon: <Shield className="w-6 h-6 mb-2 text-primary" />, items: ["Tip Replacement", "Shaft Cleaning", "Chalk pack"] },
    ]

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-emerald-400">Point of Sale</h1>
                    <p className="text-muted-foreground mt-1">Manage billing, inventory, and table fees.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cash Register / Order Entry */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        {categories.map((cat, i) => (
                            <Card key={i} className="hover-scale cursor-pointer text-center bg-card/60">
                                <CardContent className="pt-6 flex flex-col items-center">
                                    {cat.icon}
                                    <p className="font-semibold">{cat.name}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Catalog</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {categories.flatMap(c => c.items).map((item, i) => (
                                    <Button key={i} variant="outline" className="h-24 flex flex-col items-center justify-center border-dashed border-2 hover:border-emerald-500 hover:text-emerald-500 whitespace-normal text-center">
                                        <span className="font-medium">{item}</span>
                                        <span className="text-muted-foreground text-xs mt-1">${(Math.random() * 20 + 5).toFixed(2)}</span>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Current Order Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="h-full flex flex-col border-emerald-500/20">
                        <CardHeader className="bg-emerald-500/5 rounded-t-lg border-b">
                            <CardTitle className="flex items-center">
                                <Receipt className="mr-2 h-5 w-5 text-emerald-500" />
                                Current Order
                            </CardTitle>
                            <CardDescription>Table 3 - Walk-in</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 py-4">
                            {/* Dummy Order Items */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span>2 Hours (Table 3)</span>
                                    <span className="font-medium">$24.00</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span>2x Energy Drink</span>
                                    <span className="font-medium">$8.00</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col border-t bg-muted/20">
                            <div className="w-full space-y-2 mb-4">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>$32.00</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Tax (8%)</span>
                                    <span>$2.56</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border/50">
                                    <span>Total</span>
                                    <span className="text-emerald-500">$34.56</span>
                                </div>
                            </div>
                            <Button variant="emerald" className="w-full text-lg h-12">Pay Now</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
