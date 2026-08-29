import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import { useCallback, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Drug } from "../../list-build/types";
import { galleryUri } from "../gallery-uri";
import list from "../data/list.json";
import { DIRECTORY_DESCRIPTION, DIRECTORY_NAME } from "../site";
import { VerdictHtml } from "../verdict-html";
import { mnnSearch } from "../working-list";
import { useWorkingListHandle } from "../working-list/provider";

const drugs = list as Drug[];

export function generateStaticParams() {
  return drugs.map((drug) => ({ id: drug.id }));
}

function routeId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/");
}

function Gallery({ names }: { names: readonly string[] }) {
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const visible = names.filter((name) => !failed.has(name));
  if (visible.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={Platform.OS === "web"}
    >
      {visible.map((name) => (
        <Image
          key={name}
          accessibilityLabel=""
          source={{ uri: galleryUri(name) }}
          resizeMode="contain"
          style={{ width, height: 300 }}
          onError={() => {
            setFailed((prev) => {
              const next = new Set(prev);
              next.add(name);
              return next;
            });
          }}
        />
      ))}
    </ScrollView>
  );
}

export default function DrugScreen() {
  const list = useWorkingListHandle();
  const params = useLocalSearchParams<{ id: string }>();
  const id = routeId(params.id);
  const [view, setView] = useState(() => list.lookup(id));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void list.hydrate().then(() => {
        if (!cancelled) {
          setView(list.lookup(id));
        }
        void list.considerFetch("surface");
      });
      return () => {
        cancelled = true;
        list.leaveDrug();
      };
    }, [id, list]),
  );

  const { drug, notice } = view;
  const mnn = drug === null ? null : mnnSearch(drug);
  const tabTitle =
    drug === null ? DIRECTORY_NAME : `${drug.title} - ${DIRECTORY_NAME}`;

  return (
    <View style={styles.screen}>
      <Head>
        <title>{tabTitle}</title>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={goBack}
            hitSlop={8}
          >
            <MaterialIcons name="keyboard-arrow-left" size={28} color="#fff" />
          </Pressable>
          {drug !== null ? (
            <Text style={styles.appBarTitle} numberOfLines={1}>
              {drug.title}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
      {drug === null ? (
        <Text style={styles.empty}>{notice}</Text>
      ) : (
        <ScrollView>
          <Gallery names={drug.gallery} />
          <View style={styles.heading}>
            <Text style={styles.title}>{drug.title}</Text>
            {drug.source !== "" ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Источник"
                onPress={() => {
                  void Linking.openURL(drug.source);
                }}
              >
                <MaterialIcons name="link" size={24} color="#111" />
              </Pressable>
            ) : null}
          </View>
          {drug.other.length > 0 ? (
            <Text style={styles.synonyms}>{drug.other.join(", ")}</Text>
          ) : null}
          <View style={styles.category}>
            <MaterialIcons
              name="sentiment-very-dissatisfied"
              size={24}
              color={drug.label}
            />
            <Text style={styles.categoryText}>{drug.section}</Text>
          </View>
          <VerdictHtml html={drug.contents} />
          {mnn !== null ? (
            <View style={styles.mnn}>
              <Text style={styles.mnnValue}>МНН: {mnn.mnn}</Text>
              <Text style={styles.mnnHeading}>
                Поиск по базам медпрепаратов:
              </Text>
              <View style={styles.mnnButtons}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Cochrane"
                  style={styles.mnnButton}
                  onPress={() => {
                    void Linking.openURL(mnn.cochraneUrl);
                  }}
                >
                  <Text style={styles.mnnButtonText}>Cochrane</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Pubmed"
                  style={styles.mnnButton}
                  onPress={() => {
                    void Linking.openURL(mnn.pubmedUrl);
                  }}
                >
                  <Text style={styles.mnnButtonText}>Pubmed</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
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
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  appBarTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    color: "#666",
    fontSize: 16,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  title: {
    flex: 1,
    color: "#111",
    fontSize: 24,
  },
  synonyms: {
    paddingHorizontal: 16,
    paddingTop: 8,
    color: "#666",
    fontSize: 14,
  },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryText: {
    flex: 1,
    color: "#111",
    fontSize: 16,
  },
  mnn: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  mnnValue: {
    color: "#111",
    fontSize: 16,
  },
  mnnHeading: {
    marginTop: 8,
    color: "#111",
    fontSize: 20,
  },
  mnnButtons: {
    flexDirection: "row",
    marginTop: 8,
  },
  mnnButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1976d2",
  },
  mnnButtonText: {
    color: "#1976d2",
    fontWeight: "700",
  },
});
