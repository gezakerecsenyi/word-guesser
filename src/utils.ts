import { useCallback, useEffect, useState } from 'react';
import firebase from 'firebase/app';

export interface Quote {
    id: string;
    text: string;
    character: string;
    preceeding?: string;
}

export interface Session {
    id: string;
    responses: {
        data: string[]
    }[];
    name: string;
}

export interface TestQuestion {
    character: string;
    preceeding?: string;
    text: string;
}

export interface Test {
    code: string;
    id: string;
    title: string;
    questions: TestQuestion[];
    locks: firebase.firestore.Timestamp;
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

export type FrequencyType = {
    [key: string]: number,
};

export const stopwords = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'art', 'thou', 'shall', 'twas', 'thy', 'thine', 'thyself'];

export function normalizeString(e: string): string {
    return e.replaceAll(/[^a-zA-Z\-']/g, '').toLowerCase();
}

export const weightedRandFromSpec = (spec: { [key: number]: number }): number => {
    let sum = 0, r = Math.random();
    for (
        let q = 0, i = parseInt(Object.keys(spec)[0]);
        q < Object.keys(spec).length;
        q++, i = parseInt(Object.keys(spec)[q])
    ) {
        sum += spec[i];
        if (r <= sum) {
            return i;
        }
    }

    return Object.keys(spec)
        .map(e => parseInt(e))
        .sort((a, b) => a - b)
        .map(e => spec[e])[0];
};

export const weightedRandom = (frequencies: number[]) => {
    const frequencySpec = Array(frequencies.length)
        .fill(0)
        .map((e, i) => i)
        .map(e => [e, (-Math.min(...frequencies)) + frequencies[e]]);
    const total = frequencySpec.reduce((a, e) => a + e[1], 0);

    const weightedFrequencySpec = frequencySpec.map(e => [
        e[0],
        total !== 0
        ? e[1] ? 1 - e[1] / total : 1
        : 1 / frequencySpec.length,
    ]);
    const weightedTotal = weightedFrequencySpec.reduce((a, e) => a + e[1], 0);

    const compensatedSpec = weightedFrequencySpec.map(e => [
        e[0],
        e[1] / weightedTotal,
    ]);

    return weightedRandFromSpec(
        Object.fromEntries(compensatedSpec),
    );
};

export const getRandomItem = <T extends { id: string }>(array: T[], prevItems: string[] = ['']): T => {
    const cleanedArr = array.filter(e => e.id !== prevItems.slice(-1)[0]);

    const index = weightedRandom(array
        .map(V =>
            prevItems
                .map((e, i): [string, number] => [e, Math.sqrt(i + 1) * Math.random()], 0)
                .filter(e => e[0] === V.id)
                .reduce((a, e) => a + e[1], 0),
        )
        .filter((e, i) => array[i].id !== prevItems.slice(-1)[0]),
    );
    return cleanedArr[index];
};

export function useRandomItem<T extends { id: string, text: string }>(
    array: T[],
    frequencies: FrequencyType,
    callback?: () => void,
): [T, () => void, () => void, string[]] {
    const [item, setItem] = useState(JSON.parse(JSON.stringify(array[0])));
    const textData = useCallback((item) => {
        const rawWords = item.text
            .replaceAll('\n', ' ')
            .split(' ')
            .map(normalizeString)
            .filter((e: string) => e.length > 2);

        const frequenciesHere = Object.entries(frequencies).filter(e => rawWords.includes(e[0]));
        const frequencyDistribution = (i: number) => {
            return 2 * 1.25 ** -((i - 1.4 * Math.sqrt(rawWords.length)) ** 2);
        };

        const wordSet = Array(
            weightedRandFromSpec(
                Object.fromEntries(
                    Array(Math.floor(rawWords.length))
                        .fill(0)
                        .map((e, i, a) => frequencyDistribution(i) / a.reduce(
                            (A, _, I) => A + frequencyDistribution(I),
                            0,
                        ))
                        .map((e, i) => i === 0 ? [0, 0] : [i, e]),
                ),
            ) || 1,
        )
            .fill(0)
            .map(() => weightedRandom(
                frequenciesHere.map((e) => (e[1] ** 2 - 15 * e[0].length ** 4.5 as number)),
            ))
            .map(e => frequenciesHere[e || 0][0]);

        return Array.from(
            new Set(
                wordSet.map(normalizeString),
            ),
            )
            .sort((a, b) => b.length - a.length);
    }, [frequencies]);

    const [prevItems, setPrevItems] = useState([{
        id: item.id,
        textData: textData(item),
    }]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextItem = useCallback(() => {
        if (currentIndex === prevItems.length - 1) {
            const newItem = JSON.parse(
                JSON.stringify(
                    getRandomItem(array, prevItems.map(e => e.id)),
                ),
            ) as T;

            setPrevItems([
                ...prevItems,
                {
                    id: newItem.id,
                    textData: textData(newItem),
                },
            ]);
        }

        setCurrentIndex(currentIndex + 1);
        callback && callback();
    }, [array, prevItems, currentIndex]);

    const prevItem = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            callback && callback();
        }
    }, [currentIndex]);

    useEffect(() => {
        setItem(array.filter(e => e.id === prevItems[currentIndex].id)[0]);
    }, [currentIndex]);

    return [item, nextItem, prevItem, prevItems[currentIndex].textData];
}
