package main

import (
	crand "crypto/rand"
	"fmt"
	"math"
	"math/big"
	"math/rand"
	"os"
)

func main() {
	if err := randomInit(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	os.Exit(doMain())
}

// 乱数シードの初期化
func randomInit() error {
	seed, err := crand.Int(crand.Reader, big.NewInt(math.MaxInt64))
	if err != nil {
		return err
	}

	rand.Seed(seed.Int64())
	return nil
}

func doMain() int {
	config, err := parseOptions(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 2
	}

	return generatePasswords(config)
}

// 指定条件で指定個数のパスワードを作成して表示する
func generatePasswords(config config) int {
	generator := config.createGenerator()
	for i := 0; i < config.countToGenerate; i++ {
		if i > 0 {
			fmt.Println("")
		}
		password, err := generator.generate()
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return 2
		}
		fmt.Println(password)
	}

	return 0
}
