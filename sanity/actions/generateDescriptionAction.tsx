import { useState, useCallback } from 'react'
import { useClient } from 'sanity'
import type { DocumentActionProps } from 'sanity'

interface UsageInfo {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    groundingUsed: boolean
}

interface CostInfo {
    inputCost: string
    outputCost: string
    groundingCost: string
    totalCost: string
}

interface GenerateResult {
    success: boolean
    description: string
    usage: UsageInfo
    cost: CostInfo
    model: string
    error?: string
}

export function generateDescriptionAction(props: DocumentActionProps) {
    const { id, type, published, draft } = props
    const client = useClient({ apiVersion: '2024-01-01' })
    const [isGenerating, setIsGenerating] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [result, setResult] = useState<GenerateResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Only show for motorcycle documents
    if (type !== 'motorcycle') return null

    const doc = draft || published
    if (!doc) return null

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true)
        setError(null)
        setResult(null)

        try {
            // Get brand name — it's a reference, need to resolve it
            const brandRef = (doc as any).brand?._ref
            if (!brandRef) {
                setError('Nessun marchio selezionato')
                setIsGenerating(false)
                return
            }

            // Fetch brand name from Sanity
            const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
            const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
            const brandQuery = encodeURIComponent(`*[_id == "${brandRef}"][0].name`)
            const brandRes = await fetch(
                `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${brandQuery}`
            )
            const brandData = await brandRes.json()
            const brandName = brandData.result || 'Sconosciuto'

            const model = (doc as any).model
            const year = (doc as any).year

            if (!model || !year) {
                setError('Modello e anno sono obbligatori')
                setIsGenerating(false)
                return
            }

            const res = await fetch('/api/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: id,
                    brand: brandName,
                    model,
                    year,
                }),
            })

            const data = await res.json()

            if (!res.ok || data.error) {
                setError(data.error || 'Errore sconosciuto')
                setIsGenerating(false)
                setDialogOpen(true)
                return
            }

            // Save the description to the document using the stable client
            await client.patch(id).set({ shortDescription: data.description }).commit()

            setResult(data)
            setDialogOpen(true)
        } catch (err) {
            setError(`Errore di rete: ${err}`)
            setDialogOpen(true)
        } finally {
            setIsGenerating(false)
        }
    }, [doc, id, client])

    return {
        label: isGenerating ? '⏳ Generazione...' : '🤖 Genera Descrizione AI',
        disabled: isGenerating,
        onHandle: () => {
            const existing = (doc as any).shortDescription
            if (existing) {
                const ok = window.confirm(
                    'La descrizione breve esiste già. Vuoi sovrascriverla con una nuova generata dall\'AI?'
                )
                if (!ok) return
            }
            handleGenerate()
        },
        dialog: dialogOpen
            ? {
                type: 'dialog' as const,
                header: result ? '✅ Descrizione Generata' : '❌ Errore',
                onClose: () => {
                    setDialogOpen(false)
                    setResult(null)
                    setError(null)
                },
                content: result ? (
                    <div style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px' }
                    }>
                        <div style={{ marginBottom: '16px' }}>
                            <strong style={{ fontSize: '14px' }}>📝 Descrizione: </strong>
                            < p style={{
                                marginTop: '8px',
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '6px',
                                color: '#e0e0e0',
                                lineHeight: '1.6',
                                fontFamily: 'sans-serif',
                                fontSize: '14px',
                            }}>
                                {result.description}
                            </p>
                        </div>

                        < div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginBottom: '16px',
                        }}>
                            <div style={{ padding: '12px', background: '#0f0f23', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}> MODELLO </div>
                                < div style={{ color: '#fff', fontWeight: 'bold' }}> {result.model} </div>
                            </div>
                            < div style={{ padding: '12px', background: '#0f0f23', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}> GROUNDING </div>
                                < div style={{ color: result.usage.groundingUsed ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                    {result.usage.groundingUsed ? '✅ Attivo' : '❌ Non usato'}
                                </div>
                            </div>
                        </div>

                        < div style={{ marginBottom: '16px' }}>
                            <strong>📊 Token Usage: </strong>
                            < table style={{
                                width: '100%',
                                marginTop: '8px',
                                borderCollapse: 'collapse',
                            }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '6px 8px', color: '#888' }}> Input tokens </td>
                                        < td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>
                                            {result.usage.inputTokens.toLocaleString()}
                                        </td>
                                    </tr>
                                    < tr >
                                        <td style={{ padding: '6px 8px', color: '#888' }}> Output tokens </td>
                                        < td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>
                                            {result.usage.outputTokens.toLocaleString()}
                                        </td>
                                    </tr>
                                    < tr >
                                        <td style={{ padding: '6px 8px', color: '#888' }}> Totale tokens </td>
                                        < td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff', fontWeight: 'bold' }}>
                                            {result.usage.totalTokens.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        < div >
                            <strong>💰 Costi Stimati: </strong>
                            < table style={{
                                width: '100%',
                                marginTop: '8px',
                                borderCollapse: 'collapse',
                            }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '6px 8px', color: '#888' }}> Input </td>
                                        < td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>
                                            {result.cost.inputCost}
                                        </td>
                                    </tr>
                                    < tr >
                                        <td style={{ padding: '6px 8px', color: '#888' }}> Output </td>
                                        < td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>
                                            {result.cost.outputCost}
                                        </td>
                                    </tr>
                                    < tr >
                                        <td style={{ padding: '6px 8px', color: '#888' }}> Grounding(Google Search) </td>
                                        < td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>
                                            {result.cost.groundingCost}
                                        </td>
                                    </tr>
                                    < tr style={{ borderTop: '1px solid #333' }}>
                                        <td style={{ padding: '8px', color: '#fff', fontWeight: 'bold' }}> TOTALE </td>
                                        < td style={{ padding: '8px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold', fontSize: '16px' }}>
                                            {result.cost.totalCost}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        < p style={{ marginTop: '16px', color: '#888', fontSize: '11px', textAlign: 'center' }}>
                            La descrizione è stata salvata automaticamente nel campo & quot;Descrizione Breve & quot;. Ricarica il documento per vederla.
                        </p>
                    </div>
                ) : (
                    <div style={{ padding: '16px', color: '#f87171' }}>
                        <p><strong>Errore: </strong> {error}</p >
                    </div>
                ),
            }
            : null,
    }
}
