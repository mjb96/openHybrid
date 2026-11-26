// @ts-check
// =============================================================================
// EXERCISE MEDIA (Free Exercise DB stills)
//
// Two demonstration stills per lift, crossfaded into a slow loop. The source is
// Free Exercise DB (yuhonas/free-exercise-db, Unlicense/public domain), so the
// files can ship inside the AGPL app and work offline. See NOTICE.md.
//
// Keyed by canonical exercise id so aliases share one demo. Lifts without a
// defensible match deliberately have no entry: a wrong demo is worse than none.
// `label` is the source exercise's name, shown when it differs from ours (for
// example a paced variant demonstrated with the base lift).
// =============================================================================
import { resolveExercise } from './catalog.js';

/** @typedef {{ frames: [string, string], source: string, label: string }} ExerciseMedia */

/** @type {Record<string, ExerciseMedia>} */
export const EXERCISE_MEDIA = Object.freeze({
  ab_wheel_rollout: { frames: ['./assets/exercises/ab_wheel_rollout-0.webp', './assets/exercises/ab_wheel_rollout-1.webp'], source: 'free-exercise-db/Barbell_Ab_Rollout', label: 'Barbell Ab Rollout' },
  arnold_press: { frames: ['./assets/exercises/arnold_press-0.webp', './assets/exercises/arnold_press-1.webp'], source: 'free-exercise-db/Arnold_Dumbbell_Press', label: 'Arnold Dumbbell Press' },
  back_extension: { frames: ['./assets/exercises/back_extension-0.webp', './assets/exercises/back_extension-1.webp'], source: 'free-exercise-db/Hyperextensions_Back_Extensions', label: 'Hyperextensions (Back Extensions)' },
  back_squat: { frames: ['./assets/exercises/back_squat-0.webp', './assets/exercises/back_squat-1.webp'], source: 'free-exercise-db/Barbell_Squat', label: 'Barbell Squat' },
  band_chest_press: { frames: ['./assets/exercises/band_chest_press-0.webp', './assets/exercises/band_chest_press-1.webp'], source: 'free-exercise-db/Bench_Press_-_With_Bands', label: 'Bench Press - With Bands' },
  band_curl: { frames: ['./assets/exercises/band_curl-0.webp', './assets/exercises/band_curl-1.webp'], source: 'free-exercise-db/Standing_Biceps_Cable_Curl', label: 'Standing Biceps Cable Curl' },
  band_face_pull: { frames: ['./assets/exercises/band_face_pull-0.webp', './assets/exercises/band_face_pull-1.webp'], source: 'free-exercise-db/Face_Pull', label: 'Face Pull' },
  band_good_morning: { frames: ['./assets/exercises/band_good_morning-0.webp', './assets/exercises/band_good_morning-1.webp'], source: 'free-exercise-db/Band_Good_Morning', label: 'Band Good Morning' },
  band_kneeling_crunch: { frames: ['./assets/exercises/band_kneeling_crunch-0.webp', './assets/exercises/band_kneeling_crunch-1.webp'], source: 'free-exercise-db/Cable_Crunch', label: 'Cable Crunch' },
  band_lat_pulldown: { frames: ['./assets/exercises/band_lat_pulldown-0.webp', './assets/exercises/band_lat_pulldown-1.webp'], source: 'free-exercise-db/Wide-Grip_Lat_Pulldown', label: 'Wide-Grip Lat Pulldown' },
  band_lateral_raise: { frames: ['./assets/exercises/band_lateral_raise-0.webp', './assets/exercises/band_lateral_raise-1.webp'], source: 'free-exercise-db/Lateral_Raise_-_With_Bands', label: 'Lateral Raise - With Bands' },
  band_leg_curl: { frames: ['./assets/exercises/band_leg_curl-0.webp', './assets/exercises/band_leg_curl-1.webp'], source: 'free-exercise-db/Lying_Leg_Curls', label: 'Lying Leg Curls' },
  band_overhead_triceps_extension: { frames: ['./assets/exercises/band_overhead_triceps_extension-0.webp', './assets/exercises/band_overhead_triceps_extension-1.webp'], source: 'free-exercise-db/Cable_Rope_Overhead_Triceps_Extension', label: 'Cable Rope Overhead Triceps Extension' },
  band_pull_apart: { frames: ['./assets/exercises/band_pull_apart-0.webp', './assets/exercises/band_pull_apart-1.webp'], source: 'free-exercise-db/Band_Pull_Apart', label: 'Band Pull Apart' },
  band_pull_through: { frames: ['./assets/exercises/band_pull_through-0.webp', './assets/exercises/band_pull_through-1.webp'], source: 'free-exercise-db/Pull_Through', label: 'Pull Through' },
  band_romanian_deadlift: { frames: ['./assets/exercises/band_romanian_deadlift-0.webp', './assets/exercises/band_romanian_deadlift-1.webp'], source: 'free-exercise-db/Romanian_Deadlift', label: 'Romanian Deadlift' },
  band_row: { frames: ['./assets/exercises/band_row-0.webp', './assets/exercises/band_row-1.webp'], source: 'free-exercise-db/Seated_Cable_Rows', label: 'Seated Cable Rows' },
  band_triceps_pushdown: { frames: ['./assets/exercises/band_triceps_pushdown-0.webp', './assets/exercises/band_triceps_pushdown-1.webp'], source: 'free-exercise-db/Triceps_Pushdown', label: 'Triceps Pushdown' },
  barbell_bench_press: { frames: ['./assets/exercises/barbell_bench_press-0.webp', './assets/exercises/barbell_bench_press-1.webp'], source: 'free-exercise-db/Barbell_Bench_Press_-_Medium_Grip', label: 'Barbell Bench Press - Medium Grip' },
  barbell_bulgarian_split_squat: { frames: ['./assets/exercises/barbell_bulgarian_split_squat-0.webp', './assets/exercises/barbell_bulgarian_split_squat-1.webp'], source: 'free-exercise-db/Split_Squat_with_Dumbbells', label: 'Split Squat with Dumbbells' },
  barbell_curl: { frames: ['./assets/exercises/barbell_curl-0.webp', './assets/exercises/barbell_curl-1.webp'], source: 'free-exercise-db/Barbell_Curl', label: 'Barbell Curl' },
  barbell_floor_press: { frames: ['./assets/exercises/barbell_floor_press-0.webp', './assets/exercises/barbell_floor_press-1.webp'], source: 'free-exercise-db/Floor_Press', label: 'Floor Press' },
  barbell_glute_bridge: { frames: ['./assets/exercises/barbell_glute_bridge-0.webp', './assets/exercises/barbell_glute_bridge-1.webp'], source: 'free-exercise-db/Barbell_Glute_Bridge', label: 'Barbell Glute Bridge' },
  barbell_hip_thrust: { frames: ['./assets/exercises/barbell_hip_thrust-0.webp', './assets/exercises/barbell_hip_thrust-1.webp'], source: 'free-exercise-db/Barbell_Hip_Thrust', label: 'Barbell Hip Thrust' },
  barbell_overhead_press: { frames: ['./assets/exercises/barbell_overhead_press-0.webp', './assets/exercises/barbell_overhead_press-1.webp'], source: 'free-exercise-db/Standing_Military_Press', label: 'Standing Military Press' },
  barbell_reverse_lunge: { frames: ['./assets/exercises/barbell_reverse_lunge-0.webp', './assets/exercises/barbell_reverse_lunge-1.webp'], source: 'free-exercise-db/Barbell_Lunge', label: 'Barbell Lunge' },
  barbell_row: { frames: ['./assets/exercises/barbell_row-0.webp', './assets/exercises/barbell_row-1.webp'], source: 'free-exercise-db/Bent_Over_Barbell_Row', label: 'Bent Over Barbell Row' },
  barbell_shrug: { frames: ['./assets/exercises/barbell_shrug-0.webp', './assets/exercises/barbell_shrug-1.webp'], source: 'free-exercise-db/Barbell_Shrug', label: 'Barbell Shrug' },
  barbell_standing_calf_raise: { frames: ['./assets/exercises/barbell_standing_calf_raise-0.webp', './assets/exercises/barbell_standing_calf_raise-1.webp'], source: 'free-exercise-db/Standing_Barbell_Calf_Raise', label: 'Standing Barbell Calf Raise' },
  barbell_step_up: { frames: ['./assets/exercises/barbell_step_up-0.webp', './assets/exercises/barbell_step_up-1.webp'], source: 'free-exercise-db/Step-up_with_Knee_Raise', label: 'Step-up with Knee Raise' },
  bench_dip: { frames: ['./assets/exercises/bench_dip-0.webp', './assets/exercises/bench_dip-1.webp'], source: 'free-exercise-db/Bench_Dips', label: 'Bench Dips' },
  bicycle_crunch: { frames: ['./assets/exercises/bicycle_crunch-0.webp', './assets/exercises/bicycle_crunch-1.webp'], source: 'free-exercise-db/Air_Bike', label: 'Air Bike' },
  bodyweight_squat: { frames: ['./assets/exercises/bodyweight_squat-0.webp', './assets/exercises/bodyweight_squat-1.webp'], source: 'free-exercise-db/Bodyweight_Squat', label: 'Bodyweight Squat' },
  bulgarian_split_squat: { frames: ['./assets/exercises/bulgarian_split_squat-0.webp', './assets/exercises/bulgarian_split_squat-1.webp'], source: 'free-exercise-db/Split_Squat_with_Dumbbells', label: 'Split Squat with Dumbbells' },
  cable_crunch: { frames: ['./assets/exercises/cable_crunch-0.webp', './assets/exercises/cable_crunch-1.webp'], source: 'free-exercise-db/Cable_Crunch', label: 'Cable Crunch' },
  cable_curl: { frames: ['./assets/exercises/cable_curl-0.webp', './assets/exercises/cable_curl-1.webp'], source: 'free-exercise-db/Standing_Biceps_Cable_Curl', label: 'Standing Biceps Cable Curl' },
  cable_fly: { frames: ['./assets/exercises/cable_fly-0.webp', './assets/exercises/cable_fly-1.webp'], source: 'free-exercise-db/Flat_Bench_Cable_Flyes', label: 'Flat Bench Cable Flyes' },
  cable_row: { frames: ['./assets/exercises/cable_row-0.webp', './assets/exercises/cable_row-1.webp'], source: 'free-exercise-db/Seated_Cable_Rows', label: 'Seated Cable Rows' },
  cable_triceps_pushdown: { frames: ['./assets/exercises/cable_triceps_pushdown-0.webp', './assets/exercises/cable_triceps_pushdown-1.webp'], source: 'free-exercise-db/Triceps_Pushdown', label: 'Triceps Pushdown' },
  chest_supported_dumbbell_row: { frames: ['./assets/exercises/chest_supported_dumbbell_row-0.webp', './assets/exercises/chest_supported_dumbbell_row-1.webp'], source: 'free-exercise-db/Dumbbell_Incline_Row', label: 'Dumbbell Incline Row' },
  chin_up: { frames: ['./assets/exercises/chin_up-0.webp', './assets/exercises/chin_up-1.webp'], source: 'free-exercise-db/Chin-Up', label: 'Chin-Up' },
  close_grip_bench_press: { frames: ['./assets/exercises/close_grip_bench_press-0.webp', './assets/exercises/close_grip_bench_press-1.webp'], source: 'free-exercise-db/Close-Grip_Barbell_Bench_Press', label: 'Close-Grip Barbell Bench Press' },
  concentration_curl: { frames: ['./assets/exercises/concentration_curl-0.webp', './assets/exercises/concentration_curl-1.webp'], source: 'free-exercise-db/Concentration_Curls', label: 'Concentration Curls' },
  conventional_deadlift: { frames: ['./assets/exercises/conventional_deadlift-0.webp', './assets/exercises/conventional_deadlift-1.webp'], source: 'free-exercise-db/Barbell_Deadlift', label: 'Barbell Deadlift' },
  dead_bug: { frames: ['./assets/exercises/dead_bug-0.webp', './assets/exercises/dead_bug-1.webp'], source: 'free-exercise-db/Dead_Bug', label: 'Dead Bug' },
  dead_hang: { frames: ['./assets/exercises/dead_hang-0.webp', './assets/exercises/dead_hang-1.webp'], source: 'free-exercise-db/One_Handed_Hang', label: 'One Handed Hang' },
  deficit_deadlift: { frames: ['./assets/exercises/deficit_deadlift-0.webp', './assets/exercises/deficit_deadlift-1.webp'], source: 'free-exercise-db/Deficit_Deadlift', label: 'Deficit Deadlift' },
  diamond_push_up: { frames: ['./assets/exercises/diamond_push_up-0.webp', './assets/exercises/diamond_push_up-1.webp'], source: 'free-exercise-db/Pushups_Close_and_Wide_Hand_Positions', label: 'Pushups (Close and Wide Hand Positions)' },
  dip: { frames: ['./assets/exercises/dip-0.webp', './assets/exercises/dip-1.webp'], source: 'free-exercise-db/Dips_-_Chest_Version', label: 'Dips - Chest Version' },
  dumbbell_bench_press: { frames: ['./assets/exercises/dumbbell_bench_press-0.webp', './assets/exercises/dumbbell_bench_press-1.webp'], source: 'free-exercise-db/Dumbbell_Bench_Press', label: 'Dumbbell Bench Press' },
  dumbbell_curl: { frames: ['./assets/exercises/dumbbell_curl-0.webp', './assets/exercises/dumbbell_curl-1.webp'], source: 'free-exercise-db/Dumbbell_Bicep_Curl', label: 'Dumbbell Bicep Curl' },
  dumbbell_floor_press: { frames: ['./assets/exercises/dumbbell_floor_press-0.webp', './assets/exercises/dumbbell_floor_press-1.webp'], source: 'free-exercise-db/Dumbbell_Floor_Press', label: 'Dumbbell Floor Press' },
  dumbbell_fly: { frames: ['./assets/exercises/dumbbell_fly-0.webp', './assets/exercises/dumbbell_fly-1.webp'], source: 'free-exercise-db/Dumbbell_Flyes', label: 'Dumbbell Flyes' },
  dumbbell_front_squat: { frames: ['./assets/exercises/dumbbell_front_squat-0.webp', './assets/exercises/dumbbell_front_squat-1.webp'], source: 'free-exercise-db/Dumbbell_Squat', label: 'Dumbbell Squat' },
  dumbbell_hip_thrust: { frames: ['./assets/exercises/dumbbell_hip_thrust-0.webp', './assets/exercises/dumbbell_hip_thrust-1.webp'], source: 'free-exercise-db/Barbell_Hip_Thrust', label: 'Barbell Hip Thrust' },
  dumbbell_lateral_raise: { frames: ['./assets/exercises/dumbbell_lateral_raise-0.webp', './assets/exercises/dumbbell_lateral_raise-1.webp'], source: 'free-exercise-db/Side_Lateral_Raise', label: 'Side Lateral Raise' },
  dumbbell_lying_leg_curl: { frames: ['./assets/exercises/dumbbell_lying_leg_curl-0.webp', './assets/exercises/dumbbell_lying_leg_curl-1.webp'], source: 'free-exercise-db/Lying_Leg_Curls', label: 'Lying Leg Curls' },
  dumbbell_pullover: { frames: ['./assets/exercises/dumbbell_pullover-0.webp', './assets/exercises/dumbbell_pullover-1.webp'], source: 'free-exercise-db/Bent-Arm_Dumbbell_Pullover', label: 'Bent-Arm Dumbbell Pullover' },
  dumbbell_romanian_deadlift: { frames: ['./assets/exercises/dumbbell_romanian_deadlift-0.webp', './assets/exercises/dumbbell_romanian_deadlift-1.webp'], source: 'free-exercise-db/Stiff-Legged_Dumbbell_Deadlift', label: 'Stiff-Legged Dumbbell Deadlift' },
  dumbbell_shoulder_press: { frames: ['./assets/exercises/dumbbell_shoulder_press-0.webp', './assets/exercises/dumbbell_shoulder_press-1.webp'], source: 'free-exercise-db/Dumbbell_Shoulder_Press', label: 'Dumbbell Shoulder Press' },
  dumbbell_shrug: { frames: ['./assets/exercises/dumbbell_shrug-0.webp', './assets/exercises/dumbbell_shrug-1.webp'], source: 'free-exercise-db/Dumbbell_Shrug', label: 'Dumbbell Shrug' },
  dumbbell_sumo_squat: { frames: ['./assets/exercises/dumbbell_sumo_squat-0.webp', './assets/exercises/dumbbell_sumo_squat-1.webp'], source: 'free-exercise-db/Dumbbell_Squat', label: 'Dumbbell Squat' },
  dumbbell_triceps_kickback: { frames: ['./assets/exercises/dumbbell_triceps_kickback-0.webp', './assets/exercises/dumbbell_triceps_kickback-1.webp'], source: 'free-exercise-db/Tricep_Dumbbell_Kickback', label: 'Tricep Dumbbell Kickback' },
  ez_bar_bent_over_row: { frames: ['./assets/exercises/ez_bar_bent_over_row-0.webp', './assets/exercises/ez_bar_bent_over_row-1.webp'], source: 'free-exercise-db/Bent_Over_Barbell_Row', label: 'Bent Over Barbell Row' },
  ez_bar_close_grip_bench_press: { frames: ['./assets/exercises/ez_bar_close_grip_bench_press-0.webp', './assets/exercises/ez_bar_close_grip_bench_press-1.webp'], source: 'free-exercise-db/Close-Grip_Barbell_Bench_Press', label: 'Close-Grip Barbell Bench Press' },
  ez_bar_curl: { frames: ['./assets/exercises/ez_bar_curl-0.webp', './assets/exercises/ez_bar_curl-1.webp'], source: 'free-exercise-db/EZ-Bar_Curl', label: 'EZ-Bar Curl' },
  ez_bar_drag_curl: { frames: ['./assets/exercises/ez_bar_drag_curl-0.webp', './assets/exercises/ez_bar_drag_curl-1.webp'], source: 'free-exercise-db/EZ-Bar_Curl', label: 'EZ-Bar Curl' },
  ez_bar_floor_press: { frames: ['./assets/exercises/ez_bar_floor_press-0.webp', './assets/exercises/ez_bar_floor_press-1.webp'], source: 'free-exercise-db/Floor_Press', label: 'Floor Press' },
  ez_bar_front_raise: { frames: ['./assets/exercises/ez_bar_front_raise-0.webp', './assets/exercises/ez_bar_front_raise-1.webp'], source: 'free-exercise-db/Front_Dumbbell_Raise', label: 'Front Dumbbell Raise' },
  ez_bar_glute_bridge: { frames: ['./assets/exercises/ez_bar_glute_bridge-0.webp', './assets/exercises/ez_bar_glute_bridge-1.webp'], source: 'free-exercise-db/Barbell_Glute_Bridge', label: 'Barbell Glute Bridge' },
  ez_bar_overhead_triceps_extension: { frames: ['./assets/exercises/ez_bar_overhead_triceps_extension-0.webp', './assets/exercises/ez_bar_overhead_triceps_extension-1.webp'], source: 'free-exercise-db/Overhead_Triceps', label: 'Overhead Triceps' },
  ez_bar_pullover: { frames: ['./assets/exercises/ez_bar_pullover-0.webp', './assets/exercises/ez_bar_pullover-1.webp'], source: 'free-exercise-db/Bent-Arm_Barbell_Pullover', label: 'Bent-Arm Barbell Pullover' },
  ez_bar_reverse_curl: { frames: ['./assets/exercises/ez_bar_reverse_curl-0.webp', './assets/exercises/ez_bar_reverse_curl-1.webp'], source: 'free-exercise-db/Standing_Dumbbell_Reverse_Curl', label: 'Standing Dumbbell Reverse Curl' },
  ez_bar_romanian_deadlift: { frames: ['./assets/exercises/ez_bar_romanian_deadlift-0.webp', './assets/exercises/ez_bar_romanian_deadlift-1.webp'], source: 'free-exercise-db/Romanian_Deadlift', label: 'Romanian Deadlift' },
  ez_bar_shrug: { frames: ['./assets/exercises/ez_bar_shrug-0.webp', './assets/exercises/ez_bar_shrug-1.webp'], source: 'free-exercise-db/Barbell_Shrug', label: 'Barbell Shrug' },
  ez_bar_skull_crusher: { frames: ['./assets/exercises/ez_bar_skull_crusher-0.webp', './assets/exercises/ez_bar_skull_crusher-1.webp'], source: 'free-exercise-db/EZ-Bar_Skullcrusher', label: 'EZ-Bar Skullcrusher' },
  ez_bar_spider_curl: { frames: ['./assets/exercises/ez_bar_spider_curl-0.webp', './assets/exercises/ez_bar_spider_curl-1.webp'], source: 'free-exercise-db/Spider_Curl', label: 'Spider Curl' },
  ez_bar_upright_row: { frames: ['./assets/exercises/ez_bar_upright_row-0.webp', './assets/exercises/ez_bar_upright_row-1.webp'], source: 'free-exercise-db/Upright_Barbell_Row', label: 'Upright Barbell Row' },
  face_pull: { frames: ['./assets/exercises/face_pull-0.webp', './assets/exercises/face_pull-1.webp'], source: 'free-exercise-db/Face_Pull', label: 'Face Pull' },
  farmer_carry: { frames: ['./assets/exercises/farmer_carry-0.webp', './assets/exercises/farmer_carry-1.webp'], source: 'free-exercise-db/Farmers_Walk', label: 'Farmer\'s Walk' },
  feet_elevated_push_up: { frames: ['./assets/exercises/feet_elevated_push_up-0.webp', './assets/exercises/feet_elevated_push_up-1.webp'], source: 'free-exercise-db/Decline_Push-Up', label: 'Decline Push-Up' },
  front_raise: { frames: ['./assets/exercises/front_raise-0.webp', './assets/exercises/front_raise-1.webp'], source: 'free-exercise-db/Front_Dumbbell_Raise', label: 'Front Dumbbell Raise' },
  front_squat: { frames: ['./assets/exercises/front_squat-0.webp', './assets/exercises/front_squat-1.webp'], source: 'free-exercise-db/Front_Squat_Clean_Grip', label: 'Front Squat (Clean Grip)' },
  glute_bridge: { frames: ['./assets/exercises/glute_bridge-0.webp', './assets/exercises/glute_bridge-1.webp'], source: 'free-exercise-db/Butt_Lift_Bridge', label: 'Butt Lift (Bridge)' },
  goblet_squat: { frames: ['./assets/exercises/goblet_squat-0.webp', './assets/exercises/goblet_squat-1.webp'], source: 'free-exercise-db/Goblet_Squat', label: 'Goblet Squat' },
  good_morning: { frames: ['./assets/exercises/good_morning-0.webp', './assets/exercises/good_morning-1.webp'], source: 'free-exercise-db/Good_Morning', label: 'Good Morning' },
  hammer_curl: { frames: ['./assets/exercises/hammer_curl-0.webp', './assets/exercises/hammer_curl-1.webp'], source: 'free-exercise-db/Alternate_Hammer_Curl', label: 'Alternate Hammer Curl' },
  hanging_leg_raise: { frames: ['./assets/exercises/hanging_leg_raise-0.webp', './assets/exercises/hanging_leg_raise-1.webp'], source: 'free-exercise-db/Hanging_Leg_Raise', label: 'Hanging Leg Raise' },
  incline_barbell_bench_press: { frames: ['./assets/exercises/incline_barbell_bench_press-0.webp', './assets/exercises/incline_barbell_bench_press-1.webp'], source: 'free-exercise-db/Barbell_Incline_Bench_Press_-_Medium_Grip', label: 'Barbell Incline Bench Press - Medium Grip' },
  incline_dumbbell_curl: { frames: ['./assets/exercises/incline_dumbbell_curl-0.webp', './assets/exercises/incline_dumbbell_curl-1.webp'], source: 'free-exercise-db/Incline_Dumbbell_Curl', label: 'Incline Dumbbell Curl' },
  incline_dumbbell_press: { frames: ['./assets/exercises/incline_dumbbell_press-0.webp', './assets/exercises/incline_dumbbell_press-1.webp'], source: 'free-exercise-db/Incline_Dumbbell_Press', label: 'Incline Dumbbell Press' },
  inverted_row: { frames: ['./assets/exercises/inverted_row-0.webp', './assets/exercises/inverted_row-1.webp'], source: 'free-exercise-db/Bodyweight_Mid_Row', label: 'Bodyweight Mid Row' },
  kettlebell_clean: { frames: ['./assets/exercises/kettlebell_clean-0.webp', './assets/exercises/kettlebell_clean-1.webp'], source: 'free-exercise-db/Two-Arm_Kettlebell_Clean', label: 'Two-Arm Kettlebell Clean' },
  kettlebell_press: { frames: ['./assets/exercises/kettlebell_press-0.webp', './assets/exercises/kettlebell_press-1.webp'], source: 'free-exercise-db/Two-Arm_Kettlebell_Military_Press', label: 'Two-Arm Kettlebell Military Press' },
  kettlebell_row: { frames: ['./assets/exercises/kettlebell_row-0.webp', './assets/exercises/kettlebell_row-1.webp'], source: 'free-exercise-db/One-Arm_Kettlebell_Row', label: 'One-Arm Kettlebell Row' },
  kettlebell_snatch: { frames: ['./assets/exercises/kettlebell_snatch-0.webp', './assets/exercises/kettlebell_snatch-1.webp'], source: 'free-exercise-db/One-Arm_Kettlebell_Snatch', label: 'One-Arm Kettlebell Snatch' },
  kettlebell_swing: { frames: ['./assets/exercises/kettlebell_swing-0.webp', './assets/exercises/kettlebell_swing-1.webp'], source: 'free-exercise-db/One-Arm_Kettlebell_Swings', label: 'One-Arm Kettlebell Swings' },
  kettlebell_windmill: { frames: ['./assets/exercises/kettlebell_windmill-0.webp', './assets/exercises/kettlebell_windmill-1.webp'], source: 'free-exercise-db/Advanced_Kettlebell_Windmill', label: 'Advanced Kettlebell Windmill' },
  landmine_row: { frames: ['./assets/exercises/landmine_row-0.webp', './assets/exercises/landmine_row-1.webp'], source: 'free-exercise-db/Bent_Over_One-Arm_Long_Bar_Row', label: 'Bent Over One-Arm Long Bar Row' },
  lat_pulldown: { frames: ['./assets/exercises/lat_pulldown-0.webp', './assets/exercises/lat_pulldown-1.webp'], source: 'free-exercise-db/Wide-Grip_Lat_Pulldown', label: 'Wide-Grip Lat Pulldown' },
  leg_curl: { frames: ['./assets/exercises/leg_curl-0.webp', './assets/exercises/leg_curl-1.webp'], source: 'free-exercise-db/Lying_Leg_Curls', label: 'Lying Leg Curls' },
  leg_extension: { frames: ['./assets/exercises/leg_extension-0.webp', './assets/exercises/leg_extension-1.webp'], source: 'free-exercise-db/Leg_Extensions', label: 'Leg Extensions' },
  leg_press: { frames: ['./assets/exercises/leg_press-0.webp', './assets/exercises/leg_press-1.webp'], source: 'free-exercise-db/Leg_Press', label: 'Leg Press' },
  lying_leg_raise: { frames: ['./assets/exercises/lying_leg_raise-0.webp', './assets/exercises/lying_leg_raise-1.webp'], source: 'free-exercise-db/Flat_Bench_Lying_Leg_Raise', label: 'Flat Bench Lying Leg Raise' },
  machine_chest_fly: { frames: ['./assets/exercises/machine_chest_fly-0.webp', './assets/exercises/machine_chest_fly-1.webp'], source: 'free-exercise-db/Butterfly', label: 'Butterfly' },
  one_arm_dumbbell_row: { frames: ['./assets/exercises/one_arm_dumbbell_row-0.webp', './assets/exercises/one_arm_dumbbell_row-1.webp'], source: 'free-exercise-db/One-Arm_Dumbbell_Row', label: 'One-Arm Dumbbell Row' },
  overhead_triceps_extension: { frames: ['./assets/exercises/overhead_triceps_extension-0.webp', './assets/exercises/overhead_triceps_extension-1.webp'], source: 'free-exercise-db/Overhead_Triceps', label: 'Overhead Triceps' },
  pallof_press: { frames: ['./assets/exercises/pallof_press-0.webp', './assets/exercises/pallof_press-1.webp'], source: 'free-exercise-db/Pallof_Press', label: 'Pallof Press' },
  paused_barbell_bench_press: { frames: ['./assets/exercises/paused_barbell_bench_press-0.webp', './assets/exercises/paused_barbell_bench_press-1.webp'], source: 'free-exercise-db/Barbell_Bench_Press_-_Medium_Grip', label: 'Barbell Bench Press - Medium Grip' },
  paused_conventional_deadlift: { frames: ['./assets/exercises/paused_conventional_deadlift-0.webp', './assets/exercises/paused_conventional_deadlift-1.webp'], source: 'free-exercise-db/Barbell_Deadlift', label: 'Barbell Deadlift' },
  paused_squat: { frames: ['./assets/exercises/paused_squat-0.webp', './assets/exercises/paused_squat-1.webp'], source: 'free-exercise-db/Barbell_Squat', label: 'Barbell Squat' },
  pendlay_row: { frames: ['./assets/exercises/pendlay_row-0.webp', './assets/exercises/pendlay_row-1.webp'], source: 'free-exercise-db/Bent_Over_Barbell_Row', label: 'Bent Over Barbell Row' },
  plank: { frames: ['./assets/exercises/plank-0.webp', './assets/exercises/plank-1.webp'], source: 'free-exercise-db/Plank', label: 'Plank' },
  pull_up: { frames: ['./assets/exercises/pull_up-0.webp', './assets/exercises/pull_up-1.webp'], source: 'free-exercise-db/Pullups', label: 'Pullups' },
  push_press: { frames: ['./assets/exercises/push_press-0.webp', './assets/exercises/push_press-1.webp'], source: 'free-exercise-db/Push_Press', label: 'Push Press' },
  push_up: { frames: ['./assets/exercises/push_up-0.webp', './assets/exercises/push_up-1.webp'], source: 'free-exercise-db/Pushups', label: 'Pushups' },
  rack_pull: { frames: ['./assets/exercises/rack_pull-0.webp', './assets/exercises/rack_pull-1.webp'], source: 'free-exercise-db/Rack_Pulls', label: 'Rack Pulls' },
  rear_delt_fly: { frames: ['./assets/exercises/rear_delt_fly-0.webp', './assets/exercises/rear_delt_fly-1.webp'], source: 'free-exercise-db/Reverse_Flyes', label: 'Reverse Flyes' },
  renegade_row: { frames: ['./assets/exercises/renegade_row-0.webp', './assets/exercises/renegade_row-1.webp'], source: 'free-exercise-db/Alternating_Renegade_Row', label: 'Alternating Renegade Row' },
  reverse_curl: { frames: ['./assets/exercises/reverse_curl-0.webp', './assets/exercises/reverse_curl-1.webp'], source: 'free-exercise-db/Standing_Dumbbell_Reverse_Curl', label: 'Standing Dumbbell Reverse Curl' },
  reverse_lunge: { frames: ['./assets/exercises/reverse_lunge-0.webp', './assets/exercises/reverse_lunge-1.webp'], source: 'free-exercise-db/Dumbbell_Rear_Lunge', label: 'Dumbbell Rear Lunge' },
  romanian_deadlift: { frames: ['./assets/exercises/romanian_deadlift-0.webp', './assets/exercises/romanian_deadlift-1.webp'], source: 'free-exercise-db/Romanian_Deadlift', label: 'Romanian Deadlift' },
  rowing: { frames: ['./assets/exercises/rowing-0.webp', './assets/exercises/rowing-1.webp'], source: 'free-exercise-db/Rowing_Stationary', label: 'Rowing, Stationary' },
  seated_calf_raise: { frames: ['./assets/exercises/seated_calf_raise-0.webp', './assets/exercises/seated_calf_raise-1.webp'], source: 'free-exercise-db/Seated_Calf_Raise', label: 'Seated Calf Raise' },
  side_plank: { frames: ['./assets/exercises/side_plank-0.webp', './assets/exercises/side_plank-1.webp'], source: 'free-exercise-db/Side_Bridge', label: 'Side Bridge' },
  single_leg_calf_raise: { frames: ['./assets/exercises/single_leg_calf_raise-0.webp', './assets/exercises/single_leg_calf_raise-1.webp'], source: 'free-exercise-db/Calf_Raise_On_A_Dumbbell', label: 'Calf Raise On A Dumbbell' },
  single_leg_dumbbell_calf_raise: { frames: ['./assets/exercises/single_leg_dumbbell_calf_raise-0.webp', './assets/exercises/single_leg_dumbbell_calf_raise-1.webp'], source: 'free-exercise-db/Dumbbell_Seated_One-Leg_Calf_Raise', label: 'Dumbbell Seated One-Leg Calf Raise' },
  single_leg_romanian_deadlift: { frames: ['./assets/exercises/single_leg_romanian_deadlift-0.webp', './assets/exercises/single_leg_romanian_deadlift-1.webp'], source: 'free-exercise-db/Kettlebell_One-Legged_Deadlift', label: 'Kettlebell One-Legged Deadlift' },
  skull_crusher: { frames: ['./assets/exercises/skull_crusher-0.webp', './assets/exercises/skull_crusher-1.webp'], source: 'free-exercise-db/EZ-Bar_Skullcrusher', label: 'EZ-Bar Skullcrusher' },
  sled_pull: { frames: ['./assets/exercises/sled_pull-0.webp', './assets/exercises/sled_pull-1.webp'], source: 'free-exercise-db/Sled_Drag_-_Harness', label: 'Sled Drag - Harness' },
  sled_push: { frames: ['./assets/exercises/sled_push-0.webp', './assets/exercises/sled_push-1.webp'], source: 'free-exercise-db/Sled_Push', label: 'Sled Push' },
  standing_calf_raise: { frames: ['./assets/exercises/standing_calf_raise-0.webp', './assets/exercises/standing_calf_raise-1.webp'], source: 'free-exercise-db/Standing_Calf_Raises', label: 'Standing Calf Raises' },
  step_up: { frames: ['./assets/exercises/step_up-0.webp', './assets/exercises/step_up-1.webp'], source: 'free-exercise-db/Step-up_with_Knee_Raise', label: 'Step-up with Knee Raise' },
  stiff_leg_deadlift: { frames: ['./assets/exercises/stiff_leg_deadlift-0.webp', './assets/exercises/stiff_leg_deadlift-1.webp'], source: 'free-exercise-db/Stiff-Legged_Barbell_Deadlift', label: 'Stiff-Legged Barbell Deadlift' },
  suitcase_carry: { frames: ['./assets/exercises/suitcase_carry-0.webp', './assets/exercises/suitcase_carry-1.webp'], source: 'free-exercise-db/Farmers_Walk', label: 'Farmer\'s Walk' },
  sumo_deadlift: { frames: ['./assets/exercises/sumo_deadlift-0.webp', './assets/exercises/sumo_deadlift-1.webp'], source: 'free-exercise-db/Sumo_Deadlift', label: 'Sumo Deadlift' },
  tempo_squat: { frames: ['./assets/exercises/tempo_squat-0.webp', './assets/exercises/tempo_squat-1.webp'], source: 'free-exercise-db/Barbell_Squat', label: 'Barbell Squat' },
  turkish_get_up: { frames: ['./assets/exercises/turkish_get_up-0.webp', './assets/exercises/turkish_get_up-1.webp'], source: 'free-exercise-db/Kettlebell_Turkish_Get-Up_Lunge_style', label: 'Kettlebell Turkish Get-Up (Lunge style)' },
  upright_row: { frames: ['./assets/exercises/upright_row-0.webp', './assets/exercises/upright_row-1.webp'], source: 'free-exercise-db/Upright_Barbell_Row', label: 'Upright Barbell Row' },
  walking_lunge: { frames: ['./assets/exercises/walking_lunge-0.webp', './assets/exercises/walking_lunge-1.webp'], source: 'free-exercise-db/Barbell_Walking_Lunge', label: 'Barbell Walking Lunge' },
  weighted_crunch: { frames: ['./assets/exercises/weighted_crunch-0.webp', './assets/exercises/weighted_crunch-1.webp'], source: 'free-exercise-db/Weighted_Crunches', label: 'Weighted Crunches' },
  weighted_sit_up: { frames: ['./assets/exercises/weighted_sit_up-0.webp', './assets/exercises/weighted_sit_up-1.webp'], source: 'free-exercise-db/Sit-Up', label: 'Sit-Up' },
});

/**
 * @param {unknown} value exercise name or id
 * @returns {ExerciseMedia|null}
 */
export function mediaForExercise(value) {
  const id = resolveExercise(/** @type {any} */ (value))?.id;
  return id ? EXERCISE_MEDIA[id] || null : null;
}

/**
 * The demo block. Two stacked images crossfade; the second is lazy and the
 * figure has a fixed aspect ratio so the modal never shifts when it loads.
 * @param {unknown} value exercise name or id
 */
export function exerciseMediaHTML(value) {
  const item = resolveExercise(/** @type {any} */ (value));
  const media = mediaForExercise(value);
  if (!item || !media) return '';
  const [first, second] = media.frames;
  const differs = normalise(media.label) !== normalise(item.name);
  return `<figure class="exercise-media" data-exercise-media
      role="img" aria-label="${escapeAttr(item.name)} demonstration${differs ? ` (${escapeAttr(media.label)})` : ''}">
    <img class="exercise-media__frame is-active" src="${first}" alt="" width="480" height="320" decoding="async">
    <img class="exercise-media__frame" src="${second}" alt="" width="480" height="320" loading="lazy" decoding="async">
    ${differs ? `<figcaption class="exercise-media__caption">Demo: ${escapeAttr(media.label)}</figcaption>` : ''}
  </figure>`;
}

/** @param {string} value */
function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** @param {string} value */
function escapeAttr(value) {
  return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** @type {WeakMap<Element, { timer: any }>} */
const mediaTimers = new WeakMap();

/**
 * Start the crossfade for every media block under `root`. Reduced motion shows
 * the first frame only; a detached block clears its own timer on the next tick.
 * @param {ParentNode|null} root
 * @param {{ intervalMs?: number }} [options]
 */
export function mountExerciseMedia(root, { intervalMs = 1400 } = {}) {
  if (!root || typeof window === 'undefined') return;
  const reduced = document.documentElement.dataset.reducedMotion === 'reduce'
    || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.querySelectorAll('[data-exercise-media]').forEach((figure) => {
    if (mediaTimers.has(figure)) return;
    const frames = /** @type {HTMLElement[]} */ ([...figure.querySelectorAll('.exercise-media__frame')]);
    if (frames.length < 2) return;
    if (reduced) { frames.forEach((f, i) => f.classList.toggle('is-active', i === 0)); return; }
    let active = 0;
    const timer = window.setInterval(() => {
      if (!figure.isConnected) { window.clearInterval(timer); mediaTimers.delete(figure); return; }
      active = (active + 1) % frames.length;
      frames.forEach((frame, index) => frame.classList.toggle('is-active', index === active));
    }, Math.max(600, Number(intervalMs) || 1400));
    mediaTimers.set(figure, { timer });
  });
}
