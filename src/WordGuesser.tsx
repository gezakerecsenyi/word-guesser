import { ReactElement, useCallback, useEffect, useState } from 'react';

interface Props {
    word: string;
    selected?: boolean;
    id?: string;
    focusser?: any;
    forceComplete?: boolean;
    forceEnable?: boolean;
    initValue?: string;

    nextWord?: () => void;
    onChange?: (word: string, id?: string) => void;
}

export default function WordGuesser(
    {
        word,
        nextWord,
        selected,
        id,
        focusser,
        forceComplete,
        forceEnable,
        onChange,
        initValue,
    }: Props,
): ReactElement {
    const [wordSoFar, setWordSoFar] = useState((initValue || '').padEnd(word.length, '_'));
    const [done, setDone] = useState(false);
    const handleType = useCallback((event) => {
        if (event.target.value.length === 1) {
            setWordSoFar(
                event.target.value.padEnd(word.length, '_')
            );
            return;
        }

        let newWord = event.target.value.replaceAll('_', '');

        if (event.target.value.length < wordSoFar.length) {
            newWord = wordSoFar.replaceAll('_', '').slice(0, -(wordSoFar.length - event.target.value.length));
        }

        if (newWord.length > word.length) {
            return;
        }

        const newWordText = newWord;
        setWordSoFar(newWordText.padEnd(word.length, '_'));

        onChange && onChange(newWordText, id);

        if (nextWord && newWord.toLowerCase() === word.toLowerCase()) {
            nextWord();
            setDone(true);
            setWordSoFar(word);
        }
    }, [wordSoFar, word, id]);

    const [awaitingFocus, setAwaitingFocus] = useState(false);
    useEffect(() => {
        if (awaitingFocus) {
            document.getElementById(id || '')?.focus();
            setAwaitingFocus(false);
        }
    }, [awaitingFocus]);

    const disabled = !forceEnable && (done || !selected || forceComplete);
    useEffect(() => {
        setAwaitingFocus(true);
    }, [disabled, focusser]);

    useEffect(() => {
        if (forceComplete) {
            setWordSoFar(word);
        }
    }, [forceComplete, word]);

    return (
        <input
            className='word-guesser'
            value={wordSoFar}
            disabled={disabled}
            onChange={handleType}
            autoComplete='off'
            autoCapitalize='off'
            autoCorrect='off'
            id={id}
            style={{
                width: `${word.length}ch`,
            }}
        />
    );
}
