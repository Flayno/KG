# Этап 2 — протокол игры Kingdom Guard (разведка)

Статус: **разведка протокола завершена** (безопасная фаза, без подключения к серверам игры).

## Игра
- Unity / IL2CPP, пакет `com.tap4fun.odin.kingdomguard`, gameId **1047**.
- Дамп протокола получен через Il2CppDumper из `libil2cpp.so` + `global-metadata.dat`
  (артефакты: `dump.cs` 68МБ, `script.json`, `il2cpp.h` — лежат в рабочем scratchpad).

## Транспорт
- Бинарный **protobuf** по схеме запрос/ответ (`...Req` / `...Ack`, namespace `cspb`,
  методы `Encode(CodedOutputStream)` / `Decode(CodedInputStream)`).
- Соединение с игровым шлюзом `…1047gate.tap4api.net` (адрес выдаёт диспетчер
  `gs.tap4fun.com?gameId=1047&area=GLOBAL`).
- Запросы **подписываются нативно** (`libsigner.so`) — алгоритм НЕ в управляемом коде.
- Есть анти-эмулятор (`libemu_checker.so`).

## Ключевые сообщения для данных сайта
Универсальный запрос рейтинга:

```
CommonRankListReq {
  RankType rankType;   // тип рейтинга (см. ниже)
  int      index;      // страница/смещение
  long     ownerID;    // id владельца (для рейтингов внутри альянса и т.п.)
  int      serverId;   // сервер
}
```

`RankType` (выдержка):
- `RankTypePower = 1` — **рейтинг мощи игроков** (= рейтинг персонажей на сайте)
- `RankTypeUnionPower = 101` — **рейтинг мощи альянсов** (= рейтинг альянсов на сайте)
- `RankTypeKill = 3`, `RankTypePlayerLevel = 14`, `RankPowerScore = 18`
- Разбивка мощи по модулям: `RankTypePlayerModulePower*` = 71..86
  (Hero/Soldier/Dragon/Equip/Tech/Vip/…)
- KvK/арена/война: 51,52,55,60,61,62, 116 и др.

Прочее полезное:
- `GetServerHistoryRankReq { int ServerHistotyCfgId }` →
  `GetServerHistoryRankAck { err; List<ServerHistoryRank> infos }` — историческая динамика сервера.
- `LavaCaveRankAck` / `LavaCavePlayerRankAck` — лава-пещера (раздел /lavacave на сайте).
- `KvkRankListAck` — KvK.

## Что осталось (рискованная фаза — нужен живой трафик)
Из статики нельзя достать: (1) маппинг сообщение→opcode на сокете,
(2) токен авторизации (выдаётся при логине через TGS SDK),
(3) алгоритм подписи из `libsigner.so`.

Для этого нужен **перехват живого трафика**: эмулятор Android + Frida/mitmproxy,
вход под **отдельным «расходным» игровым аккаунтом** (НЕ основным), один запрос рейтинга
для образца. После этого — минимальный Node-клиент: dispatch → connect → auth → CommonRankListReq.

⚠️ Подключение к серверам игры нарушает ToS tap4fun — риск бана собирающего аккаунта.
Поэтому только отдельный аккаунт, только чтение, спокойный темп.
