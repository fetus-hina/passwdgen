package main

// Pattern ... パスワード生成パターン（文字種）
type Pattern int
type patternMap map[Pattern]string

const (
	// PatternFull ... アルファベット・数字・記号
	PatternFull Pattern = iota
	// PatternAlnum ... アルファベット・数字
	PatternAlnum
	// PatternAlpha ... アルファベット
	PatternAlpha
	// PatternLowerAlnum ... 小文字・数字
	PatternLowerAlnum
	// PatternUpperAlnum ... 大文字・数字
	PatternUpperAlnum
	// PatternNumber ... 数字
	PatternNumber
)

// 「パターンID => 文字列値」のマップ
func getPatternMap() patternMap {
	return patternMap{
		PatternFull:       "full",
		PatternAlnum:      "alnum",
		PatternAlpha:      "alpha",
		PatternLowerAlnum: "lower-alnum",
		PatternUpperAlnum: "upper-alnum",
		PatternNumber:     "number",
	}
}

// 文字列化。おかしな値であれば "UNKNOWN"
func (v Pattern) String() string {
	m := getPatternMap()
	if str, ok := m[v]; ok {
		return str
	}

	return "UNKNOWN"
}

// 文字列表現から Pattern の値を取得
func parsePattern(v string) (Pattern, bool) {
	for pattern, strValue := range getPatternMap() {
		if v == strValue {
			return pattern, true
		}
	}
	return 0, false
}
