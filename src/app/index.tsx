import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Head from "expo-router/head";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Drug } from "../../list-build/types";
import list from "../data/list.json";
import { DIRECTORY_DESCRIPTION, DIRECTORY_NAME } from "../site";

const drugs = list as Drug[];

export default function ListScreen() {
  return (
    <View style={styles.screen}>
      <Head>
        <title>{DIRECTORY_NAME}</title>
        <meta name="description" content={DIRECTORY_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={DIRECTORY_NAME} />
        <meta property="og:description" content={DIRECTORY_DESCRIPTION} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={DIRECTORY_NAME} />
        <meta name="twitter:description" content={DIRECTORY_DESCRIPTION} />
      </Head>
      <SafeAreaView edges={["top"]} style={styles.appBar}>
        <View style={styles.toolbar}>
          <MaterialIcons name="search" size={24} color="#fff" />
          <View style={styles.field}>
            <Text nativeID="drug-query-label" style={styles.fieldLabel}>
              Препарат
            </Text>
            <TextInput
              accessibilityLabel="Препарат"
              accessibilityLabelledBy="drug-query-label"
              style={styles.fieldInput}
              cursorColor="#fff"
              selectionColor="#fff"
              underlineColorAndroid="transparent"
            />
          </View>
          <MaterialIcons name="info-outline" size={24} color="#fff" />
        </View>
      </SafeAreaView>
      <FlatList
        data={drugs}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            {item.other.length > 0 ? (
              <Text style={styles.synonyms}>{item.other.join(", ")}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  appBar: {
    backgroundColor: "#ff5959",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 56,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    color: "#fff",
    fontSize: 12,
  },
  fieldInput: {
    color: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    paddingVertical: 4,
    fontSize: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    color: "#111",
    fontSize: 16,
  },
  synonyms: {
    color: "#666",
    fontSize: 14,
    marginTop: 2,
  },
});
