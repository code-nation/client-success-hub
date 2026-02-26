import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StaffMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  isPreviewMode?: boolean;
  onMentionsChange?: (userIds: string[]) => void;
}

const mockStaff: StaffMember[] = [
  { user_id: 'current-user', full_name: 'Sarah Chen', email: 'sarah@agency.com' },
  { user_id: 'other-user', full_name: 'Mike Johnson', email: 'mike@agency.com' },
  { user_id: 'user-3', full_name: 'Alex Rivera', email: 'alex@agency.com' },
  { user_id: 'user-4', full_name: 'Jordan Lee', email: 'jordan@agency.com' },
];

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  isPreviewMode = false,
  onMentionsChange,
}: MentionTextareaProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPreviewMode) {
      setStaff(mockStaff);
    } else {
      fetchStaff();
    }
  }, [isPreviewMode]);

  async function fetchStaff() {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['support', 'admin']);
      if (!roleData || roleData.length === 0) return;
      const userIds = roleData.map((r) => r.user_id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      if (profileData) setStaff(profileData as StaffMember[]);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }

  // Extract mentioned user IDs from text
  const extractMentions = useCallback(
    (text: string): string[] => {
      const mentionRegex = /@(\w[\w\s]*?)(?=\s@|\s[^@]|$)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        const name = match[1].trim();
        const found = staff.find(
          (s) =>
            s.full_name?.toLowerCase() === name.toLowerCase() ||
            s.email.split('@')[0].toLowerCase() === name.toLowerCase()
        );
        if (found) mentions.push(found.user_id);
      }
      return [...new Set(mentions)];
    },
    [staff]
  );

  useEffect(() => {
    onMentionsChange?.(extractMentions(value));
  }, [value, extractMentions, onMentionsChange]);

  const filteredStaff = staff.filter((s) => {
    const query = suggestionFilter.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query)
    );
  });

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const textBetween = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show suggestions if no space-then-non-alpha after @
      if (!/\n/.test(textBetween) && textBetween.length < 20) {
        setMentionStart(lastAtIndex);
        setSuggestionFilter(textBetween);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowSuggestions(false);
  }

  function insertMention(member: StaffMember) {
    if (mentionStart === null) return;
    const name = member.full_name || member.email.split('@')[0];
    const before = value.slice(0, mentionStart);
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const after = value.slice(cursorPos);
    const newValue = `${before}@${name} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    // Focus back
    setTimeout(() => {
      const pos = mentionStart + name.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || filteredStaff.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredStaff.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredStaff[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
      {showSuggestions && filteredStaff.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 bottom-full mb-1 w-64 rounded-md border bg-popover shadow-md"
        >
          {filteredStaff.map((member, i) => (
            <button
              key={member.user_id}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                i === selectedIndex && 'bg-accent'
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
            >
              <span className="font-medium">{member.full_name || member.email.split('@')[0]}</span>
              <span className="text-muted-foreground ml-2 text-xs">{member.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
