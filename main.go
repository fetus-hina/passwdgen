package main

import (
	"fmt"
	"os"
)

func main() {
	os.Exit(doMain())
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
