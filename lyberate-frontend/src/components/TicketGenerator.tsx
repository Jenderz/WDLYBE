import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Share2, CheckCircle2 } from 'lucide-react';

interface TicketProps {
    id: string;
    type: 'Cobro' | 'Venta' | 'Pago';
    amountUsd: number;
    amountVes: number;
    rateVes: number;
    clientName: string;
    agencyName: string;
    date: string;
    onClose: () => void;
}

export const TicketGenerator = ({ id, type, amountUsd, amountVes, rateVes, clientName, agencyName, date, onClose }: TicketProps) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(ticketRef.current, {
                scale: 2, // Alta resolución
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `Ticket_${type}_${id}.png`;
            link.click();
        } catch (error) {
            console.error("Error generating ticket:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            canvas.toBlob(async (blob) => {
                if (blob && navigator.share) {
                    const file = new File([blob], `Ticket_${id}.png`, { type: 'image/png' });
                    await navigator.share({
                        title: `Comprobante ${id}`,
                        text: `Adjunto comprobante de ${type} por $${amountUsd}`,
                        files: [file]
                    });
                } else {
                    alert('El uso compartido web nativo no está soportado en este navegador. Por favor descarga la imagen e inténtalo manualmente.');
                }
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-ios-bg dark:bg-black w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">

                {/* Visual del Ticket para Screenshot */}
                <div className="p-8 bg-white text-black" ref={ticketRef} id="ticket-view">
                    <div className="text-center mb-6">
                        <img src="https://orgemac.com/api/uploads/img_1767849584_a1254615.png" alt="Logo" className="w-12 h-12 mx-auto mb-2 opacity-80 mix-blend-multiply" />
                        <h2 className="font-bold text-xl tracking-tight">LYBERATE</h2>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase mt-0.5">Comprobante de Operación</p>
                    </div>

                    <div className="flex flex-col items-center justify-center mb-6 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                        <CheckCircle2 size={32} className="text-ios-green mb-2" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{type} APROBADA</span>
                        <h3 className="text-3xl font-black mt-1">${amountUsd.toFixed(2)}</h3>
                        <p className="text-sm text-gray-500 font-medium">Bs. {amountVes.toLocaleString('es-VE')}</p>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <span className="text-gray-500 text-xs">ID Referencia</span>
                            <span className="font-bold font-mono">{id}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <span className="text-gray-500 text-xs">Fecha</span>
                            <span className="font-semibold">{date}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <span className="text-gray-500 text-xs">Cliente / Vendedor</span>
                            <span className="font-semibold">{clientName}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <span className="text-gray-500 text-xs">Agencia</span>
                            <span className="font-semibold text-right max-w-[150px] truncate">{agencyName}</span>
                        </div>
                        <div className="flex justify-between items-end pt-1">
                            <span className="text-gray-500 text-xs">Tasa BCV Aplicada</span>
                            <span className="font-semibold">Bs. {rateVes.toFixed(2)} / USD</span>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-[10px] text-gray-400 font-medium">
                        Generado de forma segura por Tecnología Lyberate
                    </div>
                </div>

                {/* Controles (No se incluyen en el screenshot) */}
                <div className="p-4 bg-ios-bg dark:bg-black/90 border-t border-black/5 dark:border-white/5 flex gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-white dark:bg-white/10 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/20 active:scale-95 transition-all"
                    >
                        <Download size={20} />
                        Descargar
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-ios-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-md"
                    >
                        <Share2 size={20} />
                        Compartir
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-none flex items-center justify-center w-14 p-3 bg-white dark:bg-white/10 text-ios-red rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 transition-all"
                    >
                        Salir
                    </button>
                </div>

            </div>
        </div>
    );
};
