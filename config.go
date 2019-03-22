package main

import (
	"errors"
	"flag"
	"fmt"
	"sort"
	"strings"
)

const (
	defaultCountToGenerate   int     = 1
	defaultLengthToGenerate  int     = 12
	defaultPatternToGenerate Pattern = PatternFull
)

type config struct {
	countToGenerate   int
	lengthToGenerate  int
	patternToGenerate Pattern
}

func parseOptions(args []string) (config, error) {
	parser := flag.NewFlagSet("", flag.ContinueOnError)
	count := parser.Int("count", defaultCountToGenerate, "生成するパスワードの数")
	length := parser.Int("length", defaultLengthToGenerate, "生成するパスワードの長さ")
	pattern := parser.String("pattern", fmt.Sprint(defaultPatternToGenerate), "生成するパスワードのパターン")
	if err := parser.Parse(args); err != nil {
		return config{}, err
	}

	var errs []string
	if *count < 1 || *count > 100 {
		errs = append(errs, "count: パスワードの数を1～100で指定してください")
	}

	if *length < 4 || *length > 72 {
		errs = append(errs, "length: パスワードの長さを4～72で指定してください")
	}

	var ok bool
	var patternParsed Pattern
	if patternParsed, ok = parsePattern(*pattern); !ok {
		var patterns []string
		for _, v := range getPatternMap() {
			patterns = append(patterns, v)
		}
		sort.Strings(patterns)
		errs = append(errs,
			"pattern: 生成パターンを指定してください: "+strings.Join(patterns, ", "),
		)
	}

	if len(errs) > 0 {
		return config{}, errors.New(strings.Join(errs, "\n"))
	}

	return config{
		countToGenerate:   *count,
		lengthToGenerate:  *length,
		patternToGenerate: patternParsed,
	}, nil
}

func (c config) createGenerator() PasswordGenerator {
	return newPasswordGenerator(c.patternToGenerate, c.lengthToGenerate)
}
