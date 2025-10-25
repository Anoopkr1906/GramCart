import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// verify coupon
export async function POST(request) {
    try {
        const {userId , has} = getAuth(request); // has property to check user's current plan

        const {code} = await request.json();
        
        const coupon = await prisma.coupon.findUnique({
            where: {code: code.toUpperCase() , 
                expiresAt: {gt: new Date()}
            }
        })

        if(!coupon){
            return NextResponse.json({error: "coupon not found"} , {status: 404});
        }

        if(coupon.forNewUser){
            const userOrders = await prisma.order.findMany({
                where: {userId}
            })

            if(userOrders.length > 0){
                return NextResponse.json({error: "coupon valid only for new users"} , {status: 400});
            }
        }

        if(coupon.forMember){
            const hasPlusPlan = has({ plan: 'plus' });
            if(!hasPlusPlan){
                return NextResponse.json({error: "coupon valid for members only"} , {status: 400});
            }
        }

        return NextResponse.json({coupon});

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400});
    }
}