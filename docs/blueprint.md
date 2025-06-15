# **App Name**: Feedback Lens

## Core Features:

- File Upload: File Upload: Upload a CSV file containing customer feedback. Uses drag-and-drop or file selection.
- Column Mapping: Data Mapping: Allows users to map the correct column from CSV files.
- Sentiment Analysis: Sentiment Analysis: Analyzes uploaded feedback, categorizing it as positive, negative, or neutral. It uses an LLM tool to reason about the degree to which any keywords are relevant for determining sentiment.
- Topic Extraction: Topic Extraction: Identifies the main topics discussed in the feedback (e.g., "Pricing", "UX"). The tool decides the number of topics based on overall patterns and the quality of matches with relevant keywords.
- Sentiment Chart: Sentiment Over Time Chart: Displays sentiment trends over time using a line chart.
- Topic Explorer: Interactive Topic Explorer: A treemap or bar chart showing the most discussed topics with click-to-filter functionality.
- Feedback Table: Live Feedback Table: A sortable table of feedback, displaying the original comment, its sentiment, and the identified topic. Populated by current filters.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), evoking trust and analytical precision.
- Background color: Light gray (#ECEFF1), offering a clean, neutral backdrop.
- Accent color: Violet (#7E57C2), used for interactive elements and highlights.
- Body and headline font: 'Inter', a sans-serif, offers a clean and modern appearance suitable for data visualization.
- Use simple, geometric icons to represent different data categories.
- Responsive grid layout to adapt to various screen sizes, ensuring optimal data presentation.
- Subtle transitions and loading animations to improve user experience without being distracting.