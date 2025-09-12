
import { Package2, Twitter, Instagram, Facebook } from "lucide-react";
import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                    <div className="flex items-center gap-3">
                         <Package2 className="h-7 w-7 text-primary" />
                         <div>
                            <h2 className="text-lg font-bold text-white">Agenda Alego</h2>
                            <p className="text-sm text-slate-400">Assembleia Legislativa de Goiás</p>
                         </div>
                    </div>
                    <div className="flex gap-6">
                        <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                            <Twitter className="h-6 w-6" />
                            <span className="sr-only">Twitter</span>
                        </Link>
                        <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                            <Instagram className="h-6 w-6" />
                            <span className="sr-only">Instagram</span>
                        </Link>
                         <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                            <Facebook className="h-6 w-6" />
                            <span className="sr-only">Facebook</span>
                        </Link>
                    </div>
                </div>
                <div className="mt-8 border-t border-slate-700 pt-6 text-center text-sm text-slate-500">
                    <p>&copy; {currentYear} Assembleia Legislativa do Estado de Goiás. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
