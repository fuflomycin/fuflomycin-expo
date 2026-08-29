import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import Head from "expo-router/head";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DIRECTORY_DESCRIPTION, DIRECTORY_NAME } from "../site";

const SCREEN_TITLE = "О справочнике";
const GITHUB_URL = "https://github.com/fuflomycin/fuflomycin-expo";
const BOOSTY_URL = "https://boosty.to/bndby";
const RSP_URL =
  "https://encyclopatia.ru/wiki/Расстрельный_список_препаратов";

function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/");
}

export default function InfoScreen() {
  return (
    <View style={styles.screen}>
      <Head>
        <title>
          {SCREEN_TITLE} - {DIRECTORY_NAME}
        </title>
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
          <Text style={styles.appBarTitle} numberOfLines={1}>
            {SCREEN_TITLE}
          </Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heading}>{SCREEN_TITLE}</Text>
        <Text style={styles.paragraph}>
          Это не источник персональных медицинских рекомендаций.
        </Text>
        <Text style={styles.paragraph}>
          Исходный код Справочника и карточек доступен на GitHub.
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Github"
          style={styles.action}
          onPress={() => {
            void Linking.openURL(GITHUB_URL);
          }}
        >
          <Text style={styles.actionText}>Github</Text>
        </Pressable>
        <Text style={styles.heading}>Поддержка</Text>
        <Text style={styles.paragraph}>Поддержать развитие Справочника:</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Boosty"
          style={styles.action}
          onPress={() => {
            void Linking.openURL(BOOSTY_URL);
          }}
        >
          <Text style={styles.actionText}>Boosty</Text>
        </Pressable>
        <Text style={styles.paragraph}>
          Справочник содержит неполный список препаратов трёх категорий:
        </Text>
        <Text style={styles.paragraph}>
          • РСП —{" "}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => {
              void Linking.openURL(RSP_URL);
            }}
          >
            расстрельный список препаратов
          </Text>{" "}
          Никиты Жукова
        </Text>
        <Text style={styles.paragraph}>• Гомеопатия</Text>
        <Text style={styles.paragraph}>
          • Негативный перечень ФК (Формулярный комитет РАМН)
        </Text>
        <Text style={styles.paragraph}>
          Список препаратов сформирован на основе отсутствия убедительных
          данных об эффективности по заявленным показаниям, как того требует
          доказательная медицина, а также по отсутствию в авторитетных
          источниках и рекомендациях.
        </Text>
        <Text style={[styles.heading, styles.legendHeading]}>Легенда</Text>
        <Text style={styles.legendItem}>
          РСП — Расстрельный список препаратов. Составлен врачом Никитой
          Жуковым.
        </Text>
        <Text style={styles.legendItem}>
          Cochrane, Pubmed, FDA, RXlist — авторитетные источники информации об
          исследованиях или препаратах, конечно, это не все, но наиболее
          известные, они индексируют подавляющее большинство работ как
          высокого качества, так и не очень.
        </Text>
        <Text style={styles.legendItem}>
          МНН — международное непатентованное наименование вещества.
        </Text>
        <Text style={styles.legendItem}>
          ВОЗ — всемирная организация здравоохранения, держит руку на пульсе
          по данным о лечении
        </Text>
        <Text style={styles.legendItem}>
          ЖНВЛП — российский перечень жизненно необходимых и важнейших
          лекарственных препаратов, куда попадают как нормальные лекарства,
          так и бесполезные, потому что таблетки из этого перечня сбывать
          намного легче: это государственное лобби.
        </Text>
        <Text style={styles.legendItem}>
          РКИ — рандомизированное клиническое исследование, оплот
          доказательной медицины; у некоторых препаратов находится парочка
          таковых, но доказательств они не прибавляют, обычно по причине
          плохого качества.
        </Text>
        <Text style={styles.legendItem}>
          РЛС — регистр лекарственных средств России
        </Text>
        <Text style={styles.legendItem}>
          ФК — формулярный комитет РАМН, наиболее здравомыслящий проект
          минздрава
        </Text>
      </ScrollView>
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
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    color: "#111",
    fontSize: 20,
    marginBottom: 8,
  },
  paragraph: {
    color: "#111",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  link: {
    color: "#ff5959",
  },
  action: {
    alignSelf: "center",
    backgroundColor: "#ff5959",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 24,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
  },
  legendHeading: {
    marginTop: 12,
    marginBottom: 10,
  },
  legendItem: {
    color: "#111",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
});
