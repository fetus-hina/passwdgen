// ハッシュ関数のテストベクタ。テストの実行時に php / openssl は使わない。
//
// 2026-11-03 に PHP 8.5.12 と OpenSSL 3.5.8 で一度だけ生成した値を埋め込んでいる。
// - md5crypt:    PHP の crypt(password, "$1$" + salt8 + "$")
// - apr1:        PHP で書いた apr1 の実装（このツールの旧版。現存しない）
// - sha512crypt: PHP の crypt(password, "$6$" + salt16 + "$")
//   上の3つは openssl passwd -1 / -apr1 / -6 -salt <salt> <password> の結果と一致することも確認済み。
// - bcrypt:      PHP の password_hash(password, PASSWORD_BCRYPT, ["cost" => 12])
// - argon2id:    PHP の password_hash(password, PASSWORD_ARGON2ID)（m=65536, t=4, p=1）
// - argon2i:     PHP の password_hash(password, PASSWORD_ARGON2I)（m=65536, t=4, p=1）
//   上の3つは、ハッシュ文字列に含まれる salt を取り出して同じハッシュになるかの比較と、検証（verify）の両方に使う。

export interface HashVector {
  readonly password: string;
  readonly salt8: string;
  readonly salt16: string;
  readonly md5crypt: string;
  readonly apr1: string;
  readonly sha512crypt: string;
  readonly bcrypt: string;
  readonly argon2id: string;
  readonly argon2i: string;
}

export const HASH_VECTORS: readonly HashVector[] = [
  {
    password: "password",
    salt8: "saltsalt",
    salt16: "abcdefghijklmnop",
    md5crypt: "$1$saltsalt$qjXMvbEw8oaL.CzflDtaK/",
    apr1: "$apr1$saltsalt$yAAkm4libquA.ZWLHbSBq/",
    sha512crypt: "$6$abcdefghijklmnop$0aenUFHf897F9u0tURIHOeACWajSuVGa7jgJGyq.DKZm/WXl/IZFvPbneFydBjomEOgM.Sh1m0L3KsS1.H5b//",
    bcrypt: "$2y$12$3Iv9nB3u5VJWHtH1J30Q/uVAb4bV3Iwi0SWpWemCXpKAGDjJqKF9O",
    argon2id: "$argon2id$v=19$m=65536,t=4,p=1$a0K5QevULqJuBHCU41mPOQ$cC2BshpHtxxAiGv0yqjJy7Cn0/EeWNRnf1lu7HBlKtg",
    argon2i: "$argon2i$v=19$m=65536,t=4,p=1$jPLpCN6kDCJCFq6HOhSWOg$8pEH2iNAFY4y+sTkJP8i2Zuyo2oYBG30zrlezrtbq0g"
  },
  {
    password: "Xk7%hR2m@bQe9wTz",
    salt8: "a1B2c3D4",
    salt16: "0123456789abcdef",
    md5crypt: "$1$a1B2c3D4$M/mtI0jjl5TOk6mtBXSLP1",
    apr1: "$apr1$a1B2c3D4$al5QT2L3E/cR4a0c1jXWy1",
    sha512crypt: "$6$0123456789abcdef$TnKusDX7Mo/IpspiAz.ILTTYx7D1kHDq4vMbxFMzxnsH.9BS2goozMvJvZO75YkGNVqLPpbYsh9UHB/JNxIqU1",
    bcrypt: "$2y$12$6HNCB7AmfmYpvLotGxHhauk53wyghiX88KqlGAHzAyNTeRyZkTXKy",
    argon2id: "$argon2id$v=19$m=65536,t=4,p=1$1W3UvKYaPqt7DL/x0dWxtA$2tw/vJfCOMFhi3qnjtndYyUkax5CrDHNHoW7p/H2oWs",
    argon2i: "$argon2i$v=19$m=65536,t=4,p=1$0SOeT6Sn9E3OR1Mevzd2gQ$xeGDHHq4MGt7iSvUqMjLFRdhvudvrxNK1m1hnjb+tmg"
  },
  {
    password: "Xk7%hR2m@bQe9wTzA",
    salt8: "Zz./9aQ1",
    salt16: "ABCDEFGHIJKLMNOP",
    md5crypt: "$1$Zz./9aQ1$r8WJzUPmsGXAwWov9dxIc0",
    apr1: "$apr1$Zz./9aQ1$YpsYrUAEGk3wIpu5NTiXI.",
    sha512crypt: "$6$ABCDEFGHIJKLMNOP$YcUVn82vk7Duc/Jfw22za5hTai9neWzYll3xx2Lv9PdpZbtzCGljOG9IqqVTx8X/4QZ0NEcg1MI7VFlniUcx0/",
    bcrypt: "$2y$12$F3mSjWqZAlukqimTrPLwLufg/8IINp0ogwswSfoXoRH8PcTmyWvaC",
    argon2id: "$argon2id$v=19$m=65536,t=4,p=1$JK4XSrcqh0KZpNWrc69ZAw$o8A9J1By0uI7LWsCC8pszCCa9LuwldRo89BAuf7Jux4",
    argon2i: "$argon2i$v=19$m=65536,t=4,p=1$GH2NX4a3Tu8cIrnZgEEg0Q$A0C/sB8osH559xmRqWvun3A8YtYeBPFKk/KFAv+M8Cc"
  },
  {
    password: "Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$Ab3$",
    salt8: "........",
    salt16: ".//..//..//..//.",
    md5crypt: "$1$........$J67eJd1cdcHI69ZdN0pgG.",
    apr1: "$apr1$........$1obFW1.Fk9Q3A7TPQA2io/",
    sha512crypt: "$6$.//..//..//..//.$wPfOvjo78b1XF7uMubtakgoF1n8Ikrxy8pq51XvFmTUdHIHPs3CWcyAqoplVUqwtq7SeRzDLIbNwV03zvgrg..",
    bcrypt: "$2y$12$hEfnQ7ivVuv4yWiNMsboLOQoyuZIu2b/d.c.oE8YEFLxUoK2Qv5aC",
    argon2id: "$argon2id$v=19$m=65536,t=4,p=1$Szw9Oz4ddiTQfYn4WvOAPw$p8pplBOTMAGPijltCKGBW7CqWX39wow8Eu+QaKu8dcQ",
    argon2i: "$argon2i$v=19$m=65536,t=4,p=1$lYxh4CPk2nq5QmBcQnAOBw$2/e/IaQzYY1sNjE7iiBtPDq/dOvKoisO3DfEaEKivCI"
  },
  {
    password: "!$%&+-@a",
    salt8: "zzzzzzzz",
    salt16: "zyxwvutsrqponmlk",
    md5crypt: "$1$zzzzzzzz$VYwnerHsd.BJX/GG3RZQh1",
    apr1: "$apr1$zzzzzzzz$bcKBCVXzyeu17MZjkN0At/",
    sha512crypt: "$6$zyxwvutsrqponmlk$WPBZ5rdt.yrwhBRGdsSg.JVJu0URM7QfT0NBCppN6ttecxthJClDO/HTe7hdPp81bHGnemPDsusiEDZGMnHxD/",
    bcrypt: "$2y$12$vuwirlbofm/XBbT52e3oLuaf/fP.0kE1yqd5DYX3zIJtkR/ypxPb.",
    argon2id: "$argon2id$v=19$m=65536,t=4,p=1$ac0L9cBr0aL4v6NiDOpB4w$1uRvrONYXf2ICTaX7qdrrnX4ye9sp4Kf3uYOgjww1jg",
    argon2i: "$argon2i$v=19$m=65536,t=4,p=1$/f9IWcyqyyRRU3hHiv4r0A$dXcrbm/fYHxQMrDn0Yr1LAMGse4ylQUok/tmjV25Mzc"
  }
];
