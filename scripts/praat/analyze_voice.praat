form: "Analyze voice sample"
    infile: "Input WAV file", ""
    outfile: "Output metrics JSON", ""
endform

Read from file: input_WAV_file$
soundName$ = selected$("Sound")
duration = Get total duration
sampleRate = Get sampling frequency

To Pitch: 0, 75, 600
meanPitch = Get mean: 0, 0, "Hertz"
pitchSd = Get standard deviation: 0, 0, "Hertz"

selectObject: "Sound " + soundName$
To Harmonicity (cc): 0.01, 75, 0.1, 1
hnr = Get mean: 0, 0

selectObject: "Sound " + soundName$
To PointProcess (periodic, cc): 75, 600
jitterLocal = Get jitter (local): 0, 0, 0.0001, 0.02, 1.3

selectObject: "Sound " + soundName$
plusObject: "PointProcess " + soundName$
shimmerLocal = Get shimmer (local): 0, 0, 0.0001, 0.02, 1.3, 1.6

selectObject: "Sound " + soundName$
To Formant (burg): 0, 5, 5500, 0.025, 50
f1 = Get mean: 1, 0, 0, "Hertz"
f2 = Get mean: 2, 0, 0, "Hertz"
f3 = Get mean: 3, 0, 0, "Hertz"

json$ = "{"
json$ = json$ + newline$ + "  ""duration_sec"": " + fixed$(duration, 3) + ","
json$ = json$ + newline$ + "  ""sample_rate_hz"": " + fixed$(sampleRate, 0) + ","
json$ = json$ + newline$ + "  ""voiced_duration_sec"": " + fixed$(duration, 3) + ","
json$ = json$ + newline$ + "  ""average_loudness_db"": null,"
json$ = json$ + newline$ + "  ""mean_pitch_hz"": " + fixed$(meanPitch, 3) + ","
json$ = json$ + newline$ + "  ""pitch_sd_hz"": " + fixed$(pitchSd, 3) + ","
json$ = json$ + newline$ + "  ""instability_rate"": null,"
json$ = json$ + newline$ + "  ""jitter_local"": " + fixed$(jitterLocal, 6) + ","
json$ = json$ + newline$ + "  ""shimmer_local"": " + fixed$(shimmerLocal, 6) + ","
json$ = json$ + newline$ + "  ""hnr_db"": " + fixed$(hnr, 3) + ","
json$ = json$ + newline$ + "  ""formants"": {"
json$ = json$ + newline$ + "    ""f1_hz"": " + fixed$(f1, 3) + ","
json$ = json$ + newline$ + "    ""f2_hz"": " + fixed$(f2, 3) + ","
json$ = json$ + newline$ + "    ""f3_hz"": " + fixed$(f3, 3)
json$ = json$ + newline$ + "  },"
json$ = json$ + newline$ + "  ""warnings"": []"
json$ = json$ + newline$ + "}"

filedelete 'output_metrics_JSON$'
fileappend 'output_metrics_JSON$' 'json$'
