package main

// Password ... 生成されたパスワードを表す構造体
type Password struct {
	plain string
}

func (p Password) String() string {
	return p.plain
}
