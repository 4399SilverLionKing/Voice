# Voice Analysis Web MVP Design

## Summary

This document defines the first MVP for a local-first voice analysis web application on Windows. The product goal is to let users record or upload a short voice sample, run acoustic analysis through an external Praat process, and receive a readable general-purpose analysis report. The MVP does not attempt real-time feedback, cloud sync, account systems, or authoritative classification of specific vocal techniques.

The guiding principle is to convert subjective vocal coaching language into observable acoustic indicators and cautious practice guidance. The system should describe what is measurable, suggest possible interpretations, and offer training advice without overstating certainty.

## Product Scope

### In Scope

- Windows-only local web application
- Browser-based recording or WAV upload
- Local backend service
- External Praat command-line invocation
- General-purpose acoustic analysis report
- Local file-based task storage
- Human-readable recommendations based on rule-driven interpretation

### Out of Scope

- Real-time feedback during singing
- Mobile support
- Cloud deployment
- Account system or remote sync
- Medical diagnosis or pathology detection
- Strong claims such as "this is throat voice" or "this is not throat voice"
- Specialized reports for a single vocal technique in the first release

## User Flow

1. User opens the local web app in a browser on Windows.
2. User records a short sample or uploads a WAV file.
3. User submits the sample for analysis.
4. Backend creates a task directory and stores the input audio.
5. Backend calls Praat with a predefined analysis script.
6. Praat extracts raw acoustic metrics and writes them to a machine-readable file.
7. Backend interprets those metrics into a report JSON.
8. Frontend renders summary, metric cards, and practice suggestions.

## System Architecture

The system is split into five modules with clear responsibilities.

### 1. Frontend Web App

Responsibilities:

- Record audio in the browser
- Upload WAV files
- Start analysis tasks
- Poll or fetch task results
- Render report summaries, metric cards, and charts

Recommended stack:

- React
- Vite

### 2. Local API Service

Responsibilities:

- Accept uploaded audio
- Validate file constraints
- Create and track task directories
- Invoke Praat through the command line
- Parse Praat outputs
- Generate final report JSON

Recommended stack:

- FastAPI

### 3. Praat Script Layer

Responsibilities:

- Load input audio
- Extract agreed acoustic metrics
- Save raw measurements in a stable output format

Non-responsibilities:

- User-facing explanations
- Product-specific judgment logic

### 4. Interpretation and Recommendation Engine

Responsibilities:

- Transform acoustic metrics into report sections
- Apply cautious heuristics and thresholds
- Produce natural-language recommendations
- Attach confidence or completeness warnings when data quality is poor

Implementation note:

- The first version should use a rule engine rather than machine learning

### 5. Local Storage

Responsibilities:

- Save task input audio
- Save Praat raw output
- Save generated report JSON

Implementation note:

- Use the local file system first, not a database

## Data Flow

1. Frontend sends audio to backend.
2. Backend writes the file to `data/tasks/<task_id>/input.wav`.
3. Backend executes `Praat.exe --run analyze_voice.praat input.wav metrics.json`.
4. Praat writes raw metrics to the task directory.
5. Backend reads the metrics and builds `report.json`.
6. Frontend displays the final report.

This separation keeps the analysis engine independent from the product logic. Future specialized workflows can reuse the same pipeline while swapping in more specific interpretation rules or additional extraction scripts.

## Report Design

The MVP report should stay narrow and interpretable. The goal is not to maximize feature count but to establish a stable analysis pipeline and produce a useful first reading.

### Report Sections

#### 1. Basic Session Information

- Audio duration
- Sample rate
- Effective voiced segment duration
- Average loudness

#### 2. Pitch and Stability

- Mean fundamental frequency
- Pitch variation
- Break or instability rate
- Notes about obvious unstable segments

#### 3. Voice Quality Clues

- Jitter
- Shimmer
- Harmonics-to-noise ratio

These should be explained as indicators of vibratory stability and noise content, not as diagnosis.

#### 4. Resonance-Related Clues

- Estimated F1
- Estimated F2
- Estimated F3
- Trend or spread notes when relevant

Descriptions should stay conservative, such as "brighter tendency," "more backed placement tendency," or "resonance behavior appears inconsistent."

### Frontend Layout

The first version should expose three report areas.

- Summary headline
- Metric cards with short explanations
- Recommendation section with 3 to 5 actionable suggestions

### Reporting Principle

The product should answer:

- What happened acoustically
- What that may suggest
- What the user can try next

It should avoid pretending to know more than the measurements support.

## Error Handling and Boundary Conditions

The MVP must explicitly handle invalid or low-confidence input cases.

### Supported Input Conditions

- Single speaker only
- Relatively clean dry voice
- Short samples, roughly 3 to 15 seconds

### Unsupported or Weak Cases

- Background accompaniment
- Strong room reverb
- Multiple simultaneous voices
- Extremely short or long clips

### Failure Cases to Handle

- No valid voiced segment detected
- Audio too short
- Audio too long
- Noise level too high
- Microphone permission denied
- Praat execution failure
- Partial metric extraction failure

### Expected Behavior

- Return a clear error message instead of a blank screen
- Allow partial report rendering when some metrics fail
- Show quality or confidence notices when the input is weak
- Tie recommendations to actual observed metrics

### Safety Language

The report must not provide medical judgment. If measurements repeatedly suggest excessive noise or instability, the system may advise re-recording in a quiet environment and, if issues persist, consulting a qualified professional.

## Technical Decisions

### Chosen Stack

- Frontend: React + Vite
- Backend: FastAPI
- Analysis engine: external Praat executable
- Storage: local file system
- Report format: JSON

### Suggested Directory Layout

```text
frontend/
backend/
scripts/praat/
data/tasks/
docs/
```

## Testing Strategy

The MVP should be covered by a small but meaningful test set.

### 1. Praat Script Tests

- Run fixed sample files through the Praat script
- Confirm output files are generated consistently

### 2. Backend API Tests

- Upload audio
- Create task
- Return report payload

### 3. Interpretation Engine Tests

- Feed fixed metric fixtures
- Verify expected summaries and recommendations

### 4. End-to-End Smoke Test

- Start local app
- Submit sample
- Confirm a readable report is produced

## Success Criteria

The MVP is considered successful when all of the following are true:

- A Windows user can run the application locally
- The browser can record or upload a sample
- The backend can invoke Praat reliably
- The system can produce a structured report JSON
- The frontend can render a readable report
- The report avoids overconfident claims and remains useful for practice

## Future Expansion

Later iterations may add:

- Specialized vocal training workflows
- Goal-specific reports such as throat-voice-related analysis
- Historical comparison across sessions
- Improved visualization
- Replacement of some Praat-derived metrics with in-house extraction where needed
- Optional cloud deployment after the local workflow is validated

The MVP should be built to allow these additions without redesigning the full pipeline.
