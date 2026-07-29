import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplicationProgress } from "../application/react-native";
import { applicationRuntime } from "../application/v1";
import { LEARNING_CONTENT } from "../data/learningContent";

export function LessonDetailScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { progress } = useApplicationProgress();
  const lesson = LEARNING_CONTENT.lessons.find(item => item.id === lessonId);
  if (lesson === undefined) return <SafeAreaView style={styles.safe}><Text>Lesson not found.</Text></SafeAreaView>;
  const unlocked = applicationRuntime.isLessonUnlocked(LEARNING_CONTENT, progress, lesson.id);
  const puzzleId = lesson.puzzleIds.find(id => !progress.puzzleProgress[id]?.completed) ?? lesson.puzzleIds[0]!;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Campaign</Text></Pressable>
    <Text style={styles.eyebrow}>LESSON {lesson.order}</Text><Text style={styles.title}>{lesson.title}</Text><Text style={styles.body}>{lesson.instruction}</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>What you will learn</Text><Text style={styles.body}>{lesson.guidance.map(step => step.title).join(" · ")}</Text><Text style={styles.meta}>{lesson.guidance.length} guided steps · {lesson.masteryStars} star mastery target</Text></View>
    <Pressable disabled={!unlocked} onPress={() => router.replace({ pathname: "/play", params: { puzzleId, lessonId: lesson.id } })} style={[styles.button,!unlocked&&styles.disabled]}><Text style={styles.buttonText}>{unlocked ? "Start lesson" : "Complete the previous lesson first"}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#F4F6F5"},container:{padding:18,gap:14},back:{fontSize:16,fontWeight:"800",color:"#277A84"},eyebrow:{marginTop:10,fontSize:10,fontWeight:"900",letterSpacing:1.4,color:"#277A84"},title:{fontSize:30,fontWeight:"900",color:"#17221E"},body:{fontSize:14,lineHeight:21,color:"#52635D"},card:{padding:16,borderRadius:12,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#D7DDDA"},cardTitle:{fontSize:18,fontWeight:"900",color:"#17221E"},meta:{marginTop:10,fontSize:11,fontWeight:"700",color:"#64746E"},button:{padding:15,borderRadius:10,alignItems:"center",backgroundColor:"#277A84"},buttonText:{fontWeight:"900",color:"#FFFFFF"},disabled:{opacity:.45}});
