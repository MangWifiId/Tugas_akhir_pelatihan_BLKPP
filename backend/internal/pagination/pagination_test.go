package pagination

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func parse(t *testing.T, target string) (Params, error) {
	t.Helper()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, target, nil)

	return Parse(context)
}

func TestParse(t *testing.T) {
	tests := []struct {
		name       string
		target     string
		wantPage   int
		wantLimit  int
		wantOffset int
		wantErr    bool
	}{
		{
			name:       "default",
			target:     "/api/products",
			wantPage:   1,
			wantLimit:  DefaultLimit,
			wantOffset: 0,
		},
		{
			name:       "halaman dan limit",
			target:     "/api/products?page=3&limit=10",
			wantPage:   3,
			wantLimit:  10,
			wantOffset: 20,
		},
		{
			name:       "limit dibatasi",
			target:     "/api/products?limit=500",
			wantPage:   1,
			wantLimit:  MaxLimit,
			wantOffset: 0,
		},
		{name: "page nol", target: "/?page=0", wantErr: true},
		{name: "page negatif", target: "/?page=-1", wantErr: true},
		{name: "page bukan angka", target: "/?page=abc", wantErr: true},
		{name: "limit nol", target: "/?limit=0", wantErr: true},
		{name: "limit negatif", target: "/?limit=-5", wantErr: true},
		{name: "page terlalu besar", target: "/?page=9223372036854775807", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			params, err := parse(t, test.target)

			if test.wantErr {
				if err == nil {
					t.Fatal("ingin error, tetapi tidak ada error")
				}
				return
			}

			if err != nil {
				t.Fatalf("error tidak terduga: %v", err)
			}

			if params.Page != test.wantPage ||
				params.Limit != test.wantLimit ||
				params.Offset != test.wantOffset {
				t.Fatalf(
					"params = %+v, ingin page=%d limit=%d offset=%d",
					params,
					test.wantPage,
					test.wantLimit,
					test.wantOffset,
				)
			}
		})
	}
}
