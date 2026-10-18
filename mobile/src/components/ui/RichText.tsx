import { Text, type TextProps } from './Text';
import { fonts } from '@/theme';

/** Tiny inline formatting: **bold** and _italic_. Anything else is shown as typed. */
const TOKEN = /(\*\*[^*\n]+\*\*|_[^_\n]+_)/g;

export function parseInline(text: string): { text: string; style: 'bold' | 'italic' | null }[] {
  return text
    .split(TOKEN)
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return { text: part.slice(2, -2), style: 'bold' as const };
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return { text: part.slice(1, -1), style: 'italic' as const };
      return { text: part, style: null };
    });
}

export function RichText({ children, ...rest }: Omit<TextProps, 'children'> & { children: string }) {
  return (
    <Text {...rest}>
      {parseInline(children).map((p, i) => (
        <Text key={i} style={p.style === 'bold' ? { fontFamily: fonts.sansBold } : p.style === 'italic' ? { fontFamily: fonts.sansItalic } : undefined}>
          {p.text}
        </Text>
      ))}
    </Text>
  );
}
