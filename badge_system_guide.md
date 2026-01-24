# Badge Surface Variables - Design System Patterns

## What Leading Design Systems Do

### Material Design (Google)
- **Status badges**: Error, Warning, Info, Success
- **Emphasis**: Default, Subtle
- **Neutral**: Gray for non-critical info

### Carbon Design System (IBM)
- **Status**: Info (blue), Success (green), Warning (yellow), Danger (red)
- **Neutral**: Gray
- **Count badges**: Primary color (for notifications)

### Polaris (Shopify)
- **Status**: Info, Success, Warning, Critical (danger)
- **Attention**: Primary color for notifications
- **Neutral**: Default gray

### Atlassian Design System
- **Status**: Info, Success, Warning, Error, Removed (red)
- **Neutral**: Default, Subtle
- **Primary**: For new/unread indicators

### Common Patterns Across Systems:

1. **Notification/Count Badges** (Primary/Accent color)
   - Unread messages, notification counts
   - High contrast, attention-grabbing

2. **Status Badges** (Semantic colors)
   - Info (blue)
   - Success (green)
   - Warning (yellow/orange)
   - Danger/Error (red)

3. **Neutral Badges** (Gray tones)
   - Default information
   - Tags, labels, metadata

4. **Emphasis Levels** (for each type)
   - Subtle: Light background, dark text
   - Default: Medium background, white/dark text
   - Strong: Dark/saturated background, white text

## Recommended Badge System for Your Design System

### Core Badge Types (Surfaces):

```
Surface/badge/
├── primary              (Brand color - unread, notifications, NEW)
├── neutral              (Gray - default tags, labels)
├── info                 (Blue - informational)
├── success              (Green - positive, completed)
├── warning              (Yellow/Orange - caution)
└── danger               (Red - error, critical, urgent)
```

### With Emphasis Variants (if needed):

```
Surface/badge/primary/
├── subtle              (Light brand tint)
├── default             (Medium brand)
└── strong              (Dark/saturated brand)

Surface/badge/neutral/
├── subtle
├── default
└── strong

[Repeat for info, success, warning, danger]
```

## Minimal Approach (Start Here):

If you want to start simple and add more later:

**Phase 1 - Essential:**
1. `Surface/badge/primary` → For unread/notification (your main use case)
2. `Surface/badge/neutral` → For general tags/labels
3. `Surface/badge/danger` → For error/urgent badges
4. `Surface/badge/success` → For positive states

**Phase 2 - Add Later:**
5. `Surface/badge/info`
6. `Surface/badge/warning`

## Text Colors (Content):

For each badge surface, you need corresponding text:

```
Content/on/badge/
├── primary              (White text on primary badge)
├── neutral              (Dark text on neutral badge)
├── info                 (Text on info badge)
├── success              (Text on success badge)
├── warning              (Text on warning badge)
└── danger               (Text on danger badge)
```

## Real-World Usage Examples:

**Primary Badge:**
- "3 unread messages"
- "NEW" label
- Notification dots
- Active indicator

**Neutral Badge:**
- "Draft" status
- Tag labels
- Category chips
- Metadata

**Success Badge:**
- "Completed"
- "Verified"
- "Active"
- "+5 points"

**Danger Badge:**
- "Error"
- "Urgent"
- "Overdue"
- "Failed"

**Info Badge:**
- "Beta"
- "Info"
- "Preview"

**Warning Badge:**
- "Pending"
- "Expiring soon"
- "Review needed"

## Aliases Recommendation:

```
Surface/badge/primary     → Surface/action/primary/default
Surface/badge/neutral     → Surface/muted
Surface/badge/info        → Surface/status/info/default
Surface/badge/success     → Surface/status/success/default
Surface/badge/warning     → Surface/status/warning/default
Surface/badge/danger      → Surface/status/error/default

Content/on/badge/primary  → Content/on-action/primary
Content/on/badge/neutral  → Content/primary
Content/on/badge/info     → Content/on/status/info/default
Content/on/badge/success  → Content/on/status/success/default
Content/on/badge/warning  → Content/on/status/warning/default
Content/on/badge/danger   → Content/on/status/danger/default
```

## Size Guidelines:

**Dot badges (notification):** 6-8px diameter
**Count badges:** 16-20px height, auto width
**Label badges:** 20-24px height, auto width, 4-8px padding
