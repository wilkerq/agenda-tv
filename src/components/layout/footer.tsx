
import { Package2 } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:justify-between">
                    <div className="flex items-center gap-3">
                         <Package2 className="h-7 w-7 text-primary" />
                         <div>
                            <h2 className="text-lg font-bold text-white">Agenda Alego</h2>
                            <p className="text-sm text-slate-400">TV Assembleia Legislativa de Goiás</p>
                         </div>
                    </div>
                </div>
                <div className="mt-8 border-t border-slate-700 pt-6 text-center text-sm text-slate-500">
                    <p>&copy; {currentYear} Assembleia Legislativa do Estado de Goiás. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
