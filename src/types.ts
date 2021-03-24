export interface Quote {
    id: string;
    text: string;
    character: string;
}

export interface Act {
    quotes: Quote[];
    name: string;
    description: string;
    number: number;
    id: string;
}

export interface PageProps {
    acts: Act[],
    setLoading?: (loading: boolean) => void,
    loading?: boolean,
}

export function normalizeString(e: string): string {
    return e.replaceAll(/[^a-zA-Z\-']/g, '').toLowerCase();
}
